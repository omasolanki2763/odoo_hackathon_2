const User = require('../models/User');
const Item = require('../models/Item');
const Swap = require('../models/Swap');
const PointsTransaction = require('../models/PointsTransaction');
const Notification = require('../models/Notification');
const ratingService = require('../services/ratingService');
const { successResponse, errorResponse, notFoundResponse, forbiddenResponse, paginatedResponse } = require('../utils/response');
const { generatePagination } = require('../utils/helpers');

class UserController {
  // Get all users (admin)
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const query = {};
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ];
      }
      if (status) query.status = status;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const users = await User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);
      const pagination = generatePagination(page, limit, total);

      return paginatedResponse(res, users, pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get public profile by username (safe allowlisted fields + trust summary + active listings)
  async getPublicProfile(req, res) {
    try {
      const { username } = req.params;
      if (!username || typeof username !== 'string' || !username.trim()) {
        return notFoundResponse(res, 'Member not found');
      }

      const user = await User.findOne({ username: username.trim() })
        .select('username firstName lastName profile createdAt status');

      if (!user || user.status === 'banned') {
        return notFoundResponse(res, 'Member not found');
      }

      const [trust, listings] = await Promise.all([
        ratingService.getUserTrustSummary(user._id),
        Item.find({ userId: user._id, status: { $in: ['available', 'approved'] } })
          .select('-adminNotes')
          .sort({ createdAt: -1 })
      ]);

      return successResponse(res, {
        username: user.username,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        memberSince: (user.profile && user.profile.joinDate) || user.createdAt,
        city: (user.profile && user.profile.location) || null,
        bio: (user.profile && user.profile.bio) || null,
        avatar: (user.profile && user.profile.avatar) || null,
        trust,
        listings
      });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id).select('-password');

      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      return successResponse(res, user);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const updateData = req.body;

      // Check if user is updating their own profile or is admin
      if (id !== userId.toString() && !req.user.isAdmin) {
        return forbiddenResponse(res, 'Not authorized to update this user');
      }

      const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      return successResponse(res, user, 'User updated successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Delete user (admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      return successResponse(res, null, 'User deleted successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user's items
  async getUserItems(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;

      const items = await Item.find({ userId: id })
        .populate('userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Item.countDocuments({ userId: id });
      const pagination = generatePagination(page, limit, total);

      return paginatedResponse(res, items, pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user's swaps
  async getUserSwaps(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status, type } = req.query;

      const query = {
        $or: [{ requesterId: id }, { itemOwnerId: id }]
      };

      if (status) query.status = status;
      if (type) query.type = type;

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

      return paginatedResponse(res, swaps, pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user's points history
  async getUserPointsHistory(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;

      const transactions = await PointsTransaction.find({ userId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await PointsTransaction.countDocuments({ userId: id });
      const pagination = generatePagination(page, limit, total);

      return paginatedResponse(res, transactions, pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user's notifications
  async getUserNotifications(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, type, isRead } = req.query;

      const query = { userId: id };
      if (type) query.type = type;
      if (isRead !== undefined) query.isRead = isRead;

      const skip = (page - 1) * limit;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments(query);
      const pagination = generatePagination(page, limit, total);

      return paginatedResponse(res, notifications, pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new UserController(); 