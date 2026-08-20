const Swap = require('../models/Swap');
const Item = require('../models/Item');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PointsTransaction = require('../models/PointsTransaction');
const pointsService = require('./pointsService');
const { generatePagination } = require('../utils/helpers');

class SwapService {
  // Create swap request
  async createSwap(requesterId, swapData) {
    try {
      const { itemId, type, requestedItemId, pointsOffered, message } = swapData;

      // Get the item being requested
      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Check if item is available
      if (item.status !== 'available' && item.status !== 'approved') {
        throw new Error('Item is not available for swapping');
      }

      // Check if user is trying to swap their own item
      if (item.userId.toString() === requesterId) {
        throw new Error('Cannot swap your own item');
      }

      // Check if swap already exists
      const existingSwap = await Swap.findOne({
        requesterId,
        itemId,
        status: { $in: ['pending', 'accepted'] }
      });

      if (existingSwap) {
        throw new Error('Swap request already exists for this item');
      }

      // Validate swap type
      if (type === 'swap' && !requestedItemId) {
        throw new Error('Requested item ID is required for swap requests');
      }

      // Validate requested item for swaps
      if (type === 'swap' && requestedItemId) {
        const requestedItem = await Item.findById(requestedItemId);
        if (!requestedItem) {
          throw new Error('Requested item not found');
        }
        
        // Check if requested item belongs to the requester
        if (requestedItem.userId.toString() !== requesterId) {
          throw new Error('You can only offer your own items in a swap');
        }
        
        // Check if requested item is available (including redeemed and accepted items that can be swapped)
        if (requestedItem.status !== 'available' && requestedItem.status !== 'approved' && requestedItem.status !== 'redeemed' && requestedItem.status !== 'accepted') {
          throw new Error('Requested item is not available for swapping');
        }
        
        // Check if user is trying to swap the same item
        if (requestedItemId === itemId) {
          throw new Error('Cannot swap an item with itself');
        }
      }

      if (type === 'redeem' && !pointsOffered) {
        throw new Error('Points offered is required for redemption');
      }

      // For redemption, check if user has enough points
      if (type === 'redeem') {
        const user = await User.findById(requesterId);
        if (user.points < pointsOffered) {
          throw new Error('Insufficient points for this redemption');
        }
      }

      // For swap requests, check if user has enough points (4 points required)
      if (type === 'swap') {
        const user = await User.findById(requesterId);
        const swapCost = 4; // Cost to create a swap request
        
        if (user.points < swapCost) {
          throw new Error('Insufficient points to create swap request. You need 4 points.');
        }
      }

      // Create swap
      const swap = new Swap({
        requesterId,
        itemOwnerId: item.userId,
        itemId,
        type,
        requestedItemId,
        pointsOffered,
        message
      });

      await swap.save();

      // Deduct points for swap requests
      if (type === 'swap') {
        const swapCost = 4;
        
        // Deduct points from requester
        await User.findByIdAndUpdate(requesterId, {
          $inc: { points: -swapCost }
        });

        // Create points transaction record
        await PointsTransaction.createTransaction(
          requesterId,
          'spent',
          swapCost,
          `Swap request fee for item: ${item.title}`,
          { relatedItemId: item._id, relatedSwapId: swap._id }
        );
      }

      // Create notification for item owner
      await Notification.createNotification(
        item.userId,
        'swap_request',
        'New Swap Request',
        `Someone wants to ${type} your item "${item.title}"`,
        { itemId: item._id, swapId: swap._id }
      );

      return swap;
    } catch (error) {
      throw error;
    }
  }

  // Accept swap request
  async acceptSwap(swapId, itemOwnerId) {
    try {
      const swap = await Swap.findById(swapId)
        .populate('itemId')
        .populate('requesterId')
        .populate('requestedItemId');

      if (!swap) {
        throw new Error('Swap not found');
      }

      // Check ownership
      if (swap.itemOwnerId.toString() !== itemOwnerId) {
        throw new Error('Not authorized to accept this swap');
      }

      // Check if swap is still pending
      if (swap.status !== 'pending') {
        throw new Error('Swap is not in pending status');
      }

      // Update swap status
      swap.status = 'accepted';
      swap.response = {
        message: 'Swap accepted',
        date: new Date()
      };
      await swap.save();

      // Update item status
      await Item.findByIdAndUpdate(swap.itemId, { status: 'swapped' });

      // If it's a swap (not redemption), update the requested item too
      if (swap.type === 'swap' && swap.requestedItemId) {
        await Item.findByIdAndUpdate(swap.requestedItemId, { status: 'swapped' });
      }

      // Handle points transaction for redemption
      if (swap.type === 'redeem') {
        // Deduct points from requester
        await User.findByIdAndUpdate(swap.requesterId, {
          $inc: { points: -swap.pointsOffered }
        });

        // Add points to item owner
        await User.findByIdAndUpdate(swap.itemOwnerId, {
          $inc: { points: swap.pointsOffered }
        });

        // Create points transactions
        await PointsTransaction.createTransaction(
          swap.requesterId,
          'spent',
          swap.pointsOffered,
          `Redeemed item: ${swap.itemId.title}`,
          { relatedItemId: swap.itemId, relatedSwapId: swap._id }
        );

        await PointsTransaction.createTransaction(
          swap.itemOwnerId,
          'received',
          swap.pointsOffered,
          `Item redeemed: ${swap.itemId.title}`,
          { relatedItemId: swap.itemId, relatedSwapId: swap._id }
        );
      }

      // For swap requests, points were already deducted when the request was created
      // No additional points transaction needed here

      // Update user stats
      await User.findByIdAndUpdate(swap.requesterId, {
        $inc: { 'stats.swapsCompleted': 1 }
      });

      await User.findByIdAndUpdate(swap.itemOwnerId, {
        $inc: { 'stats.itemsReceived': 1 }
      });

      // Create notifications
      await Notification.createNotification(
        swap.requesterId,
        'swap_accepted',
        'Swap Accepted',
        `Your swap request for "${swap.itemId.title}" has been accepted!`,
        { itemId: swap.itemId._id, swapId: swap._id }
      );

      return swap;
    } catch (error) {
      throw error;
    }
  }

  // Reject swap request
  async rejectSwap(swapId, itemOwnerId, reason = '') {
    try {
      const swap = await Swap.findById(swapId)
        .populate('itemId')
        .populate('requesterId');

      if (!swap) {
        throw new Error('Swap not found');
      }

      // Check ownership
      if (swap.itemOwnerId.toString() !== itemOwnerId) {
        throw new Error('Not authorized to reject this swap');
      }

      // Check if swap is still pending
      if (swap.status !== 'pending') {
        throw new Error('Swap is not in pending status');
      }

      // Update swap status
      swap.status = 'rejected';
      swap.response = {
        message: reason || 'Swap rejected',
        date: new Date()
      };
      await swap.save();

      // Create notification
      await Notification.createNotification(
        swap.requesterId,
        'swap_rejected',
        'Swap Rejected',
        `Your swap request for "${swap.itemId.title}" has been rejected. ${reason}`,
        { itemId: swap.itemId._id, swapId: swap._id }
      );

      return swap;
    } catch (error) {
      throw error;
    }
  }

  // Complete swap
  async completeSwap(swapId, userId) {
    try {
      const swap = await Swap.findById(swapId)
        .populate('itemId')
        .populate('requesterId')
        .populate('itemOwnerId');

      if (!swap) {
        throw new Error('Swap not found');
      }

      // Check if user is involved in the swap
      if (swap.requesterId._id.toString() !== userId && swap.itemOwnerId._id.toString() !== userId) {
        throw new Error('Not authorized to complete this swap');
      }

      // Check if swap is accepted
      if (swap.status !== 'accepted') {
        throw new Error('Swap must be accepted before completion');
      }

      // Update swap status
      swap.status = 'completed';
      swap.completedAt = new Date();
      await swap.save();

      // Create notification for both users
      await Notification.createNotification(
        swap.requesterId._id,
        'swap_completed',
        'Swap Completed',
        `Your swap for "${swap.itemId.title}" has been completed!`,
        { itemId: swap.itemId._id, swapId: swap._id }
      );

      await Notification.createNotification(
        swap.itemOwnerId._id,
        'swap_completed',
        'Swap Completed',
        `Your swap for "${swap.itemId.title}" has been completed!`,
        { itemId: swap.itemId._id, swapId: swap._id }
      );

      return swap;
    } catch (error) {
      throw error;
    }
  }

  // Direct redemption - immediate purchase
  async directRedeem(requesterId, itemId, pointsOffered) {
    try {
      // Get the item
      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Check if item is available for redemption
      if (item.status !== 'available' && item.status !== 'approved') {
        throw new Error('Item is not available for redemption');
      }

      // Check if user is trying to redeem their own item
      if (item.userId.toString() === requesterId) {
        throw new Error('Cannot redeem your own item');
      }

      // Check if user has enough points
      const user = await User.findById(requesterId);
      if (user.points < pointsOffered) {
        throw new Error('Insufficient points for this redemption');
      }

      // Check if item is already redeemed
      if (item.status === 'redeemed') {
        throw new Error('Item is already redeemed');
      }

      // Update item status to redeemed
      await Item.findByIdAndUpdate(itemId, { status: 'redeemed' });

      // Create a swap record for tracking (immediately accepted)
      const swap = new Swap({
        requesterId,
        itemOwnerId: item.userId,
        itemId,
        type: 'redeem',
        status: 'accepted',
        pointsOffered,
        response: {
          message: 'Direct redemption - automatically accepted',
          date: new Date()
        }
      });
      await swap.save();

      // Deduct points from requester
      await pointsService.deductPoints(
        requesterId,
        pointsOffered,
        `Redeemed item: ${item.title}`,
        { relatedItemId: item._id, relatedSwapId: swap._id }
      );

      // Add points to item owner
      await pointsService.addPoints(
        item.userId,
        pointsOffered,
        `Item redeemed: ${item.title}`,
        { relatedItemId: item._id, relatedSwapId: swap._id }
      );

      // Create notification for item owner
      await Notification.createNotification(
        item.userId,
        'swap_completed',
        'Item Redeemed',
        `Your item "${item.title}" has been redeemed for ${pointsOffered} points!`,
        { itemId: item._id }
      );

      // Update user stats
      await User.findByIdAndUpdate(requesterId, {
        $inc: { 'stats.itemsReceived': 1 }
      });

      await User.findByIdAndUpdate(item.userId, {
        $inc: { 'stats.itemsSold': 1 }
      });

      // Return updated item and user info
      const updatedItem = await Item.findById(itemId);
      const updatedUser = await User.findById(requesterId).select('points');

      return {
        item: updatedItem,
        user: updatedUser,
        pointsSpent: pointsOffered
      };

    } catch (error) {
      throw error;
    }
  }

  // Get user's swaps
  async getUserSwaps(userId, filters = {}, page = 1, limit = 10) {
    try {
      const query = {
        $or: [{ requesterId: userId }, { itemOwnerId: userId }]
      };

      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;

      const skip = (page - 1) * limit;

      const swaps = await Swap.find(query)
        .populate('itemId', 'title images')
        .populate('requestedItemId', 'title images')
        .populate('requesterId', 'firstName lastName username')
        .populate('itemOwnerId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Swap.countDocuments(query);
      const pagination = generatePagination(page, limit, total);

      return { swaps, pagination };
    } catch (error) {
      throw error;
    }
  }

  // Get swap by ID
  async getSwapById(swapId, userId) {
    try {
      const swap = await Swap.findById(swapId)
        .populate('itemId')
        .populate('requestedItemId')
        .populate('requesterId', 'firstName lastName username profile')
        .populate('itemOwnerId', 'firstName lastName username profile');

      if (!swap) {
        throw new Error('Swap not found');
      }

      // Check if user is involved in the swap
      if (swap.requesterId._id.toString() !== userId && swap.itemOwnerId._id.toString() !== userId) {
        throw new Error('Not authorized to view this swap');
      }

      return swap;
    } catch (error) {
      throw error;
    }
  }

  // Cancel swap
  async cancelSwap(swapId, userId) {
    try {
      const swap = await Swap.findById(swapId);
      if (!swap) {
        throw new Error('Swap not found');
      }

      // Check if user is the requester
      if (swap.requesterId.toString() !== userId) {
        throw new Error('Only the requester can cancel a swap');
      }

      // Check if swap is still pending
      if (swap.status !== 'pending') {
        throw new Error('Cannot cancel a swap that is not pending');
      }

      // Update swap status
      swap.status = 'cancelled';
      await swap.save();

      // Create notification for item owner
      await Notification.createNotification(
        swap.itemOwnerId,
        'swap_rejected',
        'Swap Cancelled',
        'A swap request has been cancelled by the requester',
        { swapId: swap._id }
      );

      return swap;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SwapService(); 