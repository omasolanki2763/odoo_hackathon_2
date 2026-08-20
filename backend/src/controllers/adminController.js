const User = require('../models/User');
const Item = require('../models/Item');
const Swap = require('../models/Swap');
const AdminAction = require('../models/AdminAction');
const pointsService = require('../services/pointsService');
const itemService = require('../services/itemService');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');

class AdminController {
  // Get admin dashboard stats
  async getDashboard(req, res) {
    try {
      const [
        totalUsers,
        totalItems,
        totalSwaps,
        pendingItems,
        activeUsers,
        completedSwaps
      ] = await Promise.all([
        User.countDocuments(),
        Item.countDocuments(),
        Swap.countDocuments(),
        Item.countDocuments({ status: 'pending' }),
        User.countDocuments({ status: 'active' }),
        Swap.countDocuments({ status: 'completed' })
      ]);

      const stats = {
        totalUsers,
        totalItems,
        totalSwaps,
        pendingItems,
        activeUsers,
        completedSwaps
      };

      return successResponse(res, stats);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get pending items for moderation
  async getPendingItems(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const items = await Item.find({ status: 'pending' })
        .populate('userId', 'firstName lastName username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Item.countDocuments({ status: 'pending' });
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };

      return successResponse(res, { items, pagination });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get all items (admin view)
  async getAllItems(req, res) {
    try {
      const { page = 1, limit = 10, status, category } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (status) query.status = status;
      if (category) query.category = category;

      const items = await Item.find(query)
        .populate('userId', 'firstName lastName username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Item.countDocuments(query);
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };

      return successResponse(res, { items, pagination });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get all users (admin view)
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      if (status) query.status = status;

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };

      return successResponse(res, { users, pagination });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get all swaps (admin view)
  async getSwaps(req, res) {
    try {
      const { page = 1, limit = 10, status, type } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (status) query.status = status;
      if (type) query.type = type;

      const swaps = await Swap.find(query)
        .populate('itemId', 'title images')
        .populate('requesterId', 'firstName lastName username')
        .populate('itemOwnerId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Swap.countDocuments(query);
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };

      return successResponse(res, { swaps, pagination });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get admin actions log
  async getAdminActions(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const actions = await AdminAction.find()
        .populate('adminId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await AdminAction.countDocuments();
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };

      return successResponse(res, { actions, pagination });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Approve item
  async approveItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;

      const item = await itemService.approveItem(id, adminId);

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'item',
        targetId: id,
        action: 'approve',
        reason: 'Item approved by admin'
      });

      return successResponse(res, item, 'Item approved successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Reject item
  async rejectItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const item = await itemService.rejectItem(id, adminId, reason);

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'item',
        targetId: id,
        action: 'reject',
        reason: reason || 'Item rejected by admin'
      });

      return successResponse(res, item, 'Item rejected successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Delete item
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;

      const item = await Item.findById(id);
      if (!item) {
        return notFoundResponse(res, 'Item not found');
      }

      // Delete the item
      await Item.findByIdAndDelete(id);

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'item',
        targetId: id,
        action: 'delete',
        reason: 'Item deleted by admin'
      });

      return successResponse(res, { message: 'Item deleted successfully' });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Suspend user
  async suspendUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const user = await User.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });

      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'user',
        targetId: id,
        action: 'suspend',
        reason: reason || 'User suspended by admin'
      });

      return successResponse(res, user, 'User suspended successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Activate user
  async activateUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const user = await User.findByIdAndUpdate(id, { status: 'active' }, { new: true });

      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'user',
        targetId: id,
        action: 'activate',
        reason: reason || 'User activated by admin'
      });

      return successResponse(res, user, 'User activated successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Ban user
  async banUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const user = await User.findByIdAndUpdate(id, { status: 'banned' }, { new: true });

      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'user',
        targetId: id,
        action: 'ban',
        reason: reason || 'User banned by admin'
      });

      return successResponse(res, user, 'User banned successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Award bonus points
  async awardBonusPoints(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { amount, reason } = req.body;

      const result = await pointsService.awardBonusPoints(id, amount, reason, { adminId });

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'user',
        targetId: id,
        action: 'bonus',
        reason: `Awarded ${amount} bonus points: ${reason}`
      });

      return successResponse(res, result, 'Bonus points awarded successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Apply penalty points
  async applyPenalty(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { amount, reason } = req.body;

      const result = await pointsService.applyPenalty(id, amount, reason, { adminId });

      // Log admin action
      await AdminAction.create({
        adminId,
        targetType: 'user',
        targetId: id,
        action: 'penalty',
        reason: `Applied ${amount} penalty points: ${reason}`
      });

      return successResponse(res, result, 'Penalty applied successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get system statistics
  async getSystemStats(req, res) {
    try {
      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        totalItems,
        availableItems,
        pendingItems,
        totalSwaps,
        completedSwaps,
        pendingSwaps
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'suspended' }),
        User.countDocuments({ status: 'banned' }),
        Item.countDocuments(),
        Item.countDocuments({ status: 'available' }),
        Item.countDocuments({ status: 'pending' }),
        Swap.countDocuments(),
        Swap.countDocuments({ status: 'completed' }),
        Swap.countDocuments({ status: 'pending' })
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          banned: bannedUsers
        },
        items: {
          total: totalItems,
          available: availableItems,
          pending: pendingItems
        },
        swaps: {
          total: totalSwaps,
          completed: completedSwaps,
          pending: pendingSwaps
        }
      };

      return successResponse(res, stats);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new AdminController(); 