const mongoose = require('mongoose');
const Swap = require('../models/Swap');
const Item = require('../models/Item');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PointsTransaction = require('../models/PointsTransaction');
const { generatePagination } = require('../utils/helpers');
const {
  ITEM_STATUSES,
  SWAP_TYPES,
  SWAP_STATUSES,
  HANDOVER_METHODS,
  POINTS_TRANSACTION_TYPES,
  SWAP_EXPIRY_MS
} = require('../utils/constants');

const REQUESTABLE_ITEM_STATUSES = [ITEM_STATUSES.AVAILABLE, ITEM_STATUSES.APPROVED];

const createServiceError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const unreserveItems = async (itemIds) => {
  const validIds = [...new Set(itemIds.filter(Boolean).map((id) => String(id)))];
  if (validIds.length === 0) return;
  await Item.updateMany(
    { _id: { $in: validIds }, status: ITEM_STATUSES.RESERVED },
    { $set: { status: ITEM_STATUSES.AVAILABLE } }
  );
};

const creditPointsWithTransaction = async (userId, amount, txType, description, options = {}) => {
  if (!amount || amount <= 0) return null;
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { points: amount } },
    { new: true }
  );
  if (!updatedUser) {
    throw createServiceError('User not found for points credit', 404);
  }
  return PointsTransaction.createTransaction(
    userId,
    txType,
    amount,
    description,
    {
      balance: updatedUser.points,
      relatedItemId: options.relatedItemId,
      relatedSwapId: options.relatedSwapId,
      metadata: options.metadata
    }
  );
};

class SwapService {
  /**
   * Transitions pending swaps past their 3-day expiresAt deadline to expired,
   * returns reserved items to available, and refunds held points once atomically.
   */
  async expirePendingSwaps() {
    if (mongoose.connection.readyState !== 1) {
      return 0;
    }

    const now = new Date();
    const candidates = await Swap.find({
      status: SWAP_STATUSES.PENDING,
      expiresAt: { $lte: now }
    }).select('_id');

    let expiredCount = 0;

    for (const candidate of candidates) {
      const expiredSwap = await Swap.findOneAndUpdate(
        {
          _id: candidate._id,
          status: SWAP_STATUSES.PENDING,
          expiresAt: { $lte: now }
        },
        {
          $set: {
            status: SWAP_STATUSES.EXPIRED,
            response: {
              message: 'Swap request expired after 3 days',
              date: now
            }
          },
          $push: {
            timeline: {
              action: 'Status changed to expired',
              date: now,
              details: 'Swap request expired automatically after 3 days'
            }
          }
        },
        { new: true }
      );

      if (!expiredSwap) {
        continue;
      }

      expiredCount += 1;
      await unreserveItems([expiredSwap.itemId, expiredSwap.requestedItemId]);

      if (expiredSwap.pointsOffered > 0) {
        const itemDoc = await Item.findById(expiredSwap.itemId).select('title');
        const itemTitle = itemDoc ? itemDoc.title : 'item';
        await creditPointsWithTransaction(
          expiredSwap.requesterId,
          expiredSwap.pointsOffered,
          POINTS_TRANSACTION_TYPES.REFUND,
          `Refund for expired swap request: ${itemTitle}`,
          {
            relatedItemId: expiredSwap.itemId,
            relatedSwapId: expiredSwap._id,
            metadata: { source: 'swap_expired' }
          }
        );
      }
    }

    return expiredCount;
  }

  /**
   * Computes a points balance quote for either a swap (item + offer) or redeem (item only).
   */
  async getQuote(requesterId, { itemId, offerId, topUp }) {
    await this.expirePendingSwaps();

    const wantedItem = await Item.findById(itemId);
    if (!wantedItem) {
      throw createServiceError('Item not found', 404);
    }
    if (!REQUESTABLE_ITEM_STATUSES.includes(wantedItem.status)) {
      throw createServiceError('Item is not available', 400);
    }
    if (String(wantedItem.userId) === String(requesterId)) {
      throw createServiceError('Cannot request or redeem your own item', 400);
    }

    const requester = await User.findById(requesterId).select('points');
    if (!requester) {
      throw createServiceError('User not found', 404);
    }
    const balanceBefore = requester.points || 0;

    if (!offerId) {
      const cost = wantedItem.pointsValue;
      return {
        mode: SWAP_TYPES.REDEEM,
        wantedItem: {
          _id: wantedItem._id,
          title: wantedItem.title,
          pointsValue: wantedItem.pointsValue
        },
        wantedPoints: cost,
        cost,
        difference: cost,
        allowedTopUp: 0,
        balanceBefore,
        balanceAfter: balanceBefore - cost,
        canAfford: balanceBefore >= cost
      };
    }

    if (String(offerId) === String(itemId)) {
      throw createServiceError('Cannot swap an item with itself', 400);
    }

    const offeredItem = await Item.findById(offerId);
    if (!offeredItem) {
      throw createServiceError('Offered item not found', 404);
    }
    if (String(offeredItem.userId) !== String(requesterId)) {
      throw createServiceError('You can only offer your own items in a swap', 400);
    }
    if (!REQUESTABLE_ITEM_STATUSES.includes(offeredItem.status)) {
      throw createServiceError('Offered item is not available for swapping', 400);
    }

    const wantedPoints = wantedItem.pointsValue;
    const offeredPoints = offeredItem.pointsValue;
    const difference = wantedPoints - offeredPoints;
    const allowedTopUp = Math.max(0, difference);

    let appliedTopUp = allowedTopUp;
    if (topUp !== undefined && topUp !== null && topUp !== '') {
      const parsed = Number(topUp);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > allowedTopUp) {
        throw createServiceError(
          `Top-up must be an integer between 0 and ${allowedTopUp}`,
          400
        );
      }
      appliedTopUp = parsed;
    }

    return {
      mode: SWAP_TYPES.SWAP,
      wantedItem: {
        _id: wantedItem._id,
        title: wantedItem.title,
        pointsValue: wantedPoints
      },
      offeredItem: {
        _id: offeredItem._id,
        title: offeredItem.title,
        pointsValue: offeredPoints
      },
      wantedPoints,
      offeredPoints,
      difference,
      allowedTopUp,
      topUpApplied: appliedTopUp,
      balanceBefore,
      balanceAfter: balanceBefore - appliedTopUp,
      canAffordTopUp: balanceBefore >= appliedTopUp
    };
  }

  /**
   * Creates a swap or redeem request, holds any required points atomically,
   * reserves target (and offered) items, and sets the 3-day reply deadline.
   */
  async createSwap(requesterId, swapData) {
    await this.expirePendingSwaps();

    const { itemId, type, requestedItemId, pointsOffered, handoverMethod, handoverNote, message } = swapData;

    if (!Object.values(SWAP_TYPES).includes(type)) {
      throw createServiceError('Invalid swap type', 400);
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw createServiceError('Item not found', 404);
    }

    if (!REQUESTABLE_ITEM_STATUSES.includes(item.status)) {
      throw createServiceError('Item is not available for swapping', 400);
    }

    if (String(item.userId) === String(requesterId)) {
      throw createServiceError('Cannot swap your own item', 400);
    }

    const existingSwap = await Swap.findOne({
      requesterId,
      itemId,
      status: { $in: [SWAP_STATUSES.PENDING, SWAP_STATUSES.ACCEPTED] }
    });
    if (existingSwap) {
      throw createServiceError('Swap request already exists for this item', 400);
    }

    let holdAmount = 0;

    if (type === SWAP_TYPES.SWAP) {
      if (!requestedItemId) {
        throw createServiceError('Offered item ID is required for swap requests', 400);
      }
      if (!handoverMethod || !Object.values(HANDOVER_METHODS).includes(handoverMethod)) {
        throw createServiceError('Handover method must be in_person or post', 400);
      }
      if (String(requestedItemId) === String(itemId)) {
        throw createServiceError('Cannot swap an item with itself', 400);
      }

      const offeredItem = await Item.findById(requestedItemId);
      if (!offeredItem) {
        throw createServiceError('Offered item not found', 404);
      }
      if (String(offeredItem.userId) !== String(requesterId)) {
        throw createServiceError('You can only offer your own items in a swap', 400);
      }
      if (!REQUESTABLE_ITEM_STATUSES.includes(offeredItem.status)) {
        throw createServiceError('Offered item is not available for swapping', 400);
      }

      const rawTopUp = pointsOffered === undefined || pointsOffered === null ? 0 : Number(pointsOffered);
      if (!Number.isInteger(rawTopUp) || rawTopUp < 0) {
        throw createServiceError('Top-up points must be a non-negative integer', 400);
      }

      const allowedTopUp = Math.max(0, item.pointsValue - offeredItem.pointsValue);
      if (rawTopUp > 0 && offeredItem.pointsValue >= item.pointsValue) {
        throw createServiceError(
          'Top-up points are only allowed when your offered item is worth less than the requested item',
          400
        );
      }
      if (rawTopUp > allowedTopUp) {
        throw createServiceError(
          `Top-up cannot exceed the ${allowedTopUp}-point difference`,
          400
        );
      }

      holdAmount = rawTopUp;
    } else {
      const cost = item.pointsValue;
      if (pointsOffered !== undefined && pointsOffered !== null && Number(pointsOffered) !== cost) {
        throw createServiceError(`Redemption requires ${cost} points`, 400);
      }
      holdAmount = cost;
    }

    let debitedUser = null;
    if (holdAmount > 0) {
      debitedUser = await User.findOneAndUpdate(
        { _id: requesterId, points: { $gte: holdAmount } },
        { $inc: { points: -holdAmount } },
        { new: true }
      );
      if (!debitedUser) {
        throw createServiceError('Insufficient points for this request', 400);
      }
    }

    const rollbackPointsHold = async () => {
      if (holdAmount > 0) {
        await User.findByIdAndUpdate(requesterId, { $inc: { points: holdAmount } });
      }
    };

    const reservedWanted = await Item.findOneAndUpdate(
      { _id: itemId, status: { $in: REQUESTABLE_ITEM_STATUSES } },
      { $set: { status: ITEM_STATUSES.RESERVED } },
      { new: true }
    );
    if (!reservedWanted) {
      await rollbackPointsHold();
      throw createServiceError('Item is no longer available', 400);
    }

    if (type === SWAP_TYPES.SWAP) {
      const reservedOffered = await Item.findOneAndUpdate(
        {
          _id: requestedItemId,
          userId: requesterId,
          status: { $in: REQUESTABLE_ITEM_STATUSES }
        },
        { $set: { status: ITEM_STATUSES.RESERVED } },
        { new: true }
      );
      if (!reservedOffered) {
        await unreserveItems([itemId]);
        await rollbackPointsHold();
        throw createServiceError('Offered item is no longer available', 400);
      }
    }

    const swap = new Swap({
      requesterId,
      itemOwnerId: item.userId,
      itemId,
      type,
      requestedItemId: type === SWAP_TYPES.SWAP ? requestedItemId : undefined,
      pointsOffered: holdAmount,
      handoverMethod,
      handoverNote,
      message,
      expiresAt: new Date(Date.now() + SWAP_EXPIRY_MS)
    });

    try {
      await swap.save();

      if (holdAmount > 0) {
        const description =
          type === SWAP_TYPES.REDEEM
            ? `Points held for redemption: ${item.title}`
            : `Points held for swap request: ${item.title}`;

        await PointsTransaction.createTransaction(
          requesterId,
          POINTS_TRANSACTION_TYPES.HOLD,
          holdAmount,
          description,
          {
            balance: debitedUser.points,
            relatedItemId: item._id,
            relatedSwapId: swap._id,
            metadata: { source: type === SWAP_TYPES.REDEEM ? 'redeem_hold' : 'swap_topup_hold' }
          }
        );
      }
    } catch (error) {
      if (swap._id) {
        await Swap.deleteOne({ _id: swap._id }).catch(() => {});
      }
      await unreserveItems([itemId, requestedItemId]);
      await rollbackPointsHold();
      throw error;
    }

    try {
      await Notification.createNotification(
        item.userId,
        'swap_request',
        'New Swap Request',
        `Someone wants to ${type} your item "${item.title}"`,
        { itemId: item._id, swapId: swap._id }
      );
    } catch (_) {
      // Non-fatal notification failure
    }

    return swap;
  }

  /**
   * Accepts a pending swap/redeem, marks items swapped/redeemed, and releases held points to the owner.
   */
  async acceptSwap(swapId, itemOwnerId) {
    await this.expirePendingSwaps();

    const existing = await Swap.findById(swapId);
    if (!existing) {
      throw createServiceError('Swap not found', 404);
    }
    if (String(existing.itemOwnerId) !== String(itemOwnerId)) {
      throw createServiceError('Not authorized to accept this swap', 403);
    }
    if (existing.status !== SWAP_STATUSES.PENDING) {
      throw createServiceError('Swap is not in pending status', 400);
    }

    const now = new Date();
    const swap = await Swap.findOneAndUpdate(
      { _id: swapId, itemOwnerId, status: SWAP_STATUSES.PENDING },
      {
        $set: {
          status: SWAP_STATUSES.ACCEPTED,
          response: {
            message: 'Swap accepted',
            date: now
          }
        },
        $push: {
          timeline: {
            action: 'Status changed to accepted',
            date: now,
            userId: itemOwnerId,
            details: 'Swap accepted by owner'
          }
        }
      },
      { new: true }
    )
      .populate('itemId')
      .populate('requesterId')
      .populate('requestedItemId');

    if (!swap) {
      throw createServiceError('Swap is no longer in pending status', 400);
    }

    const targetStatus = swap.type === SWAP_TYPES.REDEEM ? ITEM_STATUSES.REDEEMED : ITEM_STATUSES.SWAPPED;
    await Item.findByIdAndUpdate(swap.itemId._id, { status: targetStatus });

    if (swap.type === SWAP_TYPES.SWAP && swap.requestedItemId) {
      await Item.findByIdAndUpdate(swap.requestedItemId._id, { status: ITEM_STATUSES.SWAPPED });
    }

    // Release held points (redeem cost or swap top-up) to the item owner
    if (swap.pointsOffered > 0) {
      const description =
        swap.type === SWAP_TYPES.REDEEM
          ? `Item redeemed: ${swap.itemId.title}`
          : `Swap top-up received: ${swap.itemId.title}`;

      await creditPointsWithTransaction(
        swap.itemOwnerId,
        swap.pointsOffered,
        POINTS_TRANSACTION_TYPES.RECEIVED,
        description,
        {
          relatedItemId: swap.itemId._id,
          relatedSwapId: swap._id,
          metadata: { source: swap.type === SWAP_TYPES.REDEEM ? 'redeem_accepted' : 'swap_topup_accepted' }
        }
      );
    }

    await User.findByIdAndUpdate(swap.requesterId._id, {
      $inc: { 'stats.swapsCompleted': 1 }
    });
    await User.findByIdAndUpdate(swap.itemOwnerId, {
      $inc: { 'stats.itemsReceived': 1 }
    });

    try {
      await Notification.createNotification(
        swap.requesterId._id,
        'swap_accepted',
        'Swap Accepted',
        `Your swap request for "${swap.itemId.title}" has been accepted!`,
        { itemId: swap.itemId._id, swapId: swap._id }
      );
    } catch (_) {
      // Non-fatal notification failure
    }

    return swap;
  }

  /**
   * Rejects a pending swap/redeem request, unreserves items, and refunds held points to requester.
   */
  async rejectSwap(swapId, itemOwnerId, reason = '') {
    await this.expirePendingSwaps();

    const existing = await Swap.findById(swapId);
    if (!existing) {
      throw createServiceError('Swap not found', 404);
    }
    if (String(existing.itemOwnerId) !== String(itemOwnerId)) {
      throw createServiceError('Not authorized to reject this swap', 403);
    }
    if (existing.status !== SWAP_STATUSES.PENDING) {
      throw createServiceError('Swap is not in pending status', 400);
    }

    const now = new Date();
    const swap = await Swap.findOneAndUpdate(
      { _id: swapId, itemOwnerId, status: SWAP_STATUSES.PENDING },
      {
        $set: {
          status: SWAP_STATUSES.REJECTED,
          response: {
            message: reason || 'Swap rejected',
            date: now
          }
        },
        $push: {
          timeline: {
            action: 'Status changed to rejected',
            date: now,
            userId: itemOwnerId,
            details: reason || 'Swap rejected'
          }
        }
      },
      { new: true }
    )
      .populate('itemId')
      .populate('requesterId');

    if (!swap) {
      throw createServiceError('Swap is no longer in pending status', 400);
    }

    await unreserveItems([swap.itemId._id, swap.requestedItemId]);

    if (swap.pointsOffered > 0) {
      await creditPointsWithTransaction(
        swap.requesterId._id,
        swap.pointsOffered,
        POINTS_TRANSACTION_TYPES.REFUND,
        `Refund for declined swap request: ${swap.itemId.title}`,
        {
          relatedItemId: swap.itemId._id,
          relatedSwapId: swap._id,
          metadata: { source: 'swap_rejected' }
        }
      );
    }

    try {
      await Notification.createNotification(
        swap.requesterId._id,
        'swap_rejected',
        'Swap Rejected',
        `Your swap request for "${swap.itemId.title}" has been rejected. ${reason}`.trim(),
        { itemId: swap.itemId._id, swapId: swap._id }
      );
    } catch (_) {
      // Non-fatal notification failure
    }

    return swap;
  }

  // Complete swap
  async completeSwap(swapId, userId) {
    await this.expirePendingSwaps();

    const swap = await Swap.findById(swapId)
      .populate('itemId')
      .populate('requesterId')
      .populate('itemOwnerId');

    if (!swap) {
      throw createServiceError('Swap not found', 404);
    }

    if (String(swap.requesterId._id) !== String(userId) && String(swap.itemOwnerId._id) !== String(userId)) {
      throw createServiceError('Not authorized to complete this swap', 403);
    }

    if (swap.status !== SWAP_STATUSES.ACCEPTED) {
      throw createServiceError('Swap must be accepted before completion', 400);
    }

    const now = new Date();
    swap.status = SWAP_STATUSES.COMPLETED;
    swap.completedAt = now;
    swap.timeline.push({
      action: 'Status changed to completed',
      date: now,
      userId,
      details: 'Swap marked as completed'
    });
    await swap.save();

    try {
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
    } catch (_) {
      // Non-fatal notification failure
    }

    return swap;
  }

  /**
   * Direct redemption: atomically debits points and claims the item so concurrent calls cannot double-spend.
   */
  async directRedeem(requesterId, itemId, pointsOffered) {
    await this.expirePendingSwaps();

    const item = await Item.findById(itemId);
    if (!item) {
      throw createServiceError('Item not found', 404);
    }

    if (!REQUESTABLE_ITEM_STATUSES.includes(item.status)) {
      throw createServiceError('Item is not available for redemption', 400);
    }

    if (String(item.userId) === String(requesterId)) {
      throw createServiceError('Cannot redeem your own item', 400);
    }

    const cost = item.pointsValue;
    if (pointsOffered !== undefined && pointsOffered !== null && Number(pointsOffered) !== cost) {
      throw createServiceError(`Redemption requires ${cost} points`, 400);
    }

    // Atomic conditional point debit prevents concurrent double-spend
    const debitedUser = await User.findOneAndUpdate(
      { _id: requesterId, points: { $gte: cost } },
      { $inc: { points: -cost } },
      { new: true }
    );
    if (!debitedUser) {
      throw createServiceError('Insufficient points for this redemption', 400);
    }

    // Atomic conditional item claim prevents double-redemption of the same item
    const redeemedItem = await Item.findOneAndUpdate(
      { _id: itemId, status: { $in: REQUESTABLE_ITEM_STATUSES } },
      { $set: { status: ITEM_STATUSES.REDEEMED } },
      { new: true }
    );
    if (!redeemedItem) {
      await User.findByIdAndUpdate(requesterId, { $inc: { points: cost } });
      throw createServiceError('Item is no longer available for redemption', 400);
    }

    const swap = new Swap({
      requesterId,
      itemOwnerId: item.userId,
      itemId,
      type: SWAP_TYPES.REDEEM,
      status: SWAP_STATUSES.ACCEPTED,
      pointsOffered: cost,
      response: {
        message: 'Direct redemption - automatically accepted',
        date: new Date()
      }
    });

    try {
      await swap.save();

      await PointsTransaction.createTransaction(
        requesterId,
        POINTS_TRANSACTION_TYPES.SPENT,
        cost,
        `Redeemed item: ${item.title}`,
        {
          balance: debitedUser.points,
          relatedItemId: item._id,
          relatedSwapId: swap._id,
          metadata: { source: 'direct_redeem' }
        }
      );

      await creditPointsWithTransaction(
        item.userId,
        cost,
        POINTS_TRANSACTION_TYPES.RECEIVED,
        `Item redeemed: ${item.title}`,
        {
          relatedItemId: item._id,
          relatedSwapId: swap._id,
          metadata: { source: 'direct_redeem' }
        }
      );
    } catch (error) {
      if (swap._id) {
        await Swap.deleteOne({ _id: swap._id }).catch(() => {});
      }
      await Item.findByIdAndUpdate(itemId, { status: ITEM_STATUSES.AVAILABLE }).catch(() => {});
      await User.findByIdAndUpdate(requesterId, { $inc: { points: cost } }).catch(() => {});
      throw error;
    }

    await User.findByIdAndUpdate(requesterId, {
      $inc: { 'stats.itemsReceived': 1 }
    });
    await User.findByIdAndUpdate(item.userId, {
      $inc: { 'stats.itemsSold': 1 }
    });

    try {
      await Notification.createNotification(
        item.userId,
        'swap_completed',
        'Item Redeemed',
        `Your item "${item.title}" has been redeemed for ${cost} points!`,
        { itemId: item._id }
      );
    } catch (_) {
      // Non-fatal notification failure
    }

    return {
      item: redeemedItem,
      user: { _id: debitedUser._id, points: debitedUser.points },
      pointsSpent: cost
    };
  }

  // Get user's swaps
  async getUserSwaps(userId, filters = {}, page = 1, limit = 10) {
    await this.expirePendingSwaps();

    const query = {};
    if (filters.direction === 'sent') {
      query.requesterId = userId;
    } else if (filters.direction === 'received') {
      query.itemOwnerId = userId;
    } else {
      query.$or = [{ requesterId: userId }, { itemOwnerId: userId }];
    }

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    const skip = (page - 1) * limit;

    const swaps = await Swap.find(query)
      .populate('itemId', 'title images pointsValue status size category condition')
      .populate('requestedItemId', 'title images pointsValue status size category condition')
      .populate('requesterId', 'firstName lastName username')
      .populate('itemOwnerId', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Swap.countDocuments(query);
    const pagination = generatePagination(page, limit, total);

    return { swaps, pagination };
  }

  // Get swap by ID
  async getSwapById(swapId, userId) {
    await this.expirePendingSwaps();

    const swap = await Swap.findById(swapId)
      .populate('itemId')
      .populate('requestedItemId')
      .populate('requesterId', 'firstName lastName username profile createdAt')
      .populate('itemOwnerId', 'firstName lastName username profile createdAt');

    if (!swap) {
      throw createServiceError('Swap not found', 404);
    }

    if (
      String(swap.requesterId._id) !== String(userId) &&
      String(swap.itemOwnerId._id) !== String(userId)
    ) {
      throw createServiceError('Not authorized to view this swap', 403);
    }

    const relatedTransactions = await PointsTransaction.find({ relatedSwapId: swap._id })
      .sort({ createdAt: 1 })
      .lean();

    const transactions = relatedTransactions.map((tx) => {
      const entry = {
        _id: tx._id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        createdAt: tx.createdAt,
        metadata: tx.metadata
      };
      if (String(tx.userId) === String(userId)) {
        entry.balance = tx.balance;
      }
      return entry;
    });

    const swapObject = swap.toObject();
    swapObject.transactions = transactions;
    return swapObject;
  }

  /**
   * Cancels a pending swap/redeem request by requester, unreserves items, and refunds held points.
   */
  async cancelSwap(swapId, userId) {
    await this.expirePendingSwaps();

    const existing = await Swap.findById(swapId);
    if (!existing) {
      throw createServiceError('Swap not found', 404);
    }
    if (String(existing.requesterId) !== String(userId)) {
      throw createServiceError('Only the requester can cancel a swap', 403);
    }
    if (existing.status !== SWAP_STATUSES.PENDING) {
      throw createServiceError('Cannot cancel a swap that is not pending', 400);
    }

    const now = new Date();
    const swap = await Swap.findOneAndUpdate(
      { _id: swapId, requesterId: userId, status: SWAP_STATUSES.PENDING },
      {
        $set: { status: SWAP_STATUSES.CANCELLED },
        $push: {
          timeline: {
            action: 'Status changed to cancelled',
            date: now,
            userId,
            details: 'Cancelled by requester'
          }
        }
      },
      { new: true }
    );

    if (!swap) {
      throw createServiceError('Cannot cancel a swap that is not pending', 400);
    }

    await unreserveItems([swap.itemId, swap.requestedItemId]);

    if (swap.pointsOffered > 0) {
      const itemDoc = await Item.findById(swap.itemId).select('title');
      const itemTitle = itemDoc ? itemDoc.title : 'item';
      await creditPointsWithTransaction(
        swap.requesterId,
        swap.pointsOffered,
        POINTS_TRANSACTION_TYPES.REFUND,
        `Refund for cancelled swap request: ${itemTitle}`,
        {
          relatedItemId: swap.itemId,
          relatedSwapId: swap._id,
          metadata: { source: 'swap_cancelled' }
        }
      );
    }

    try {
      await Notification.createNotification(
        swap.itemOwnerId,
        'swap_rejected',
        'Swap Cancelled',
        'A swap request has been cancelled by the requester',
        { swapId: swap._id }
      );
    } catch (_) {
      // Non-fatal notification failure
    }

    return swap;
  }
}

module.exports = new SwapService();
