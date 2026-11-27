const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const Swap = require('../models/Swap');
const Rating = require('../models/Rating');
const { generateToken } = require('../config/jwt');
const Notification = require('../models/Notification');
const PointsTransaction = require('../models/PointsTransaction');
const swapService = require('./swapService');
const ratingService = require('./ratingService');
const { POINTS_TRANSACTION_TYPES, STARTER_POINTS } = require('../utils/constants');
const { pickEditableProfileFields, toProfileUpdateError } = require('../utils/editableProfile');

class AuthService {
  // Register new user and record starter points in a single rollback-safe flow
  async register(userData) {
    const normalizedEmail = String(userData.email || '').trim().toLowerCase();
    const normalizedUsername = String(userData.username || '').trim();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });
    if (existingUser) {
      const dupError = new Error(
        existingUser.email === normalizedEmail
          ? 'User with this email already exists'
          : 'Username already taken'
      );
      dupError.statusCode = 400;
      throw dupError;
    }

    const firstName = normalizedUsername.charAt(0).toUpperCase() + normalizedUsername.slice(1);
    const lastName = 'User';

    // Start new user at 0 points, record ledger entry, then credit balance
    const user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: userData.password,
      firstName,
      lastName,
      points: 0
    });

    try {
      await user.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        const dupError = new Error('User with this email or username already exists');
        dupError.statusCode = 400;
        throw dupError;
      }
      throw saveError;
    }

    let welcomeTransaction = null;
    try {
      welcomeTransaction = await PointsTransaction.createTransaction(
        user._id,
        POINTS_TRANSACTION_TYPES.BONUS,
        STARTER_POINTS,
        'Welcome points',
        {
          balance: STARTER_POINTS,
          metadata: {
            source: 'welcome_bonus',
            reason: 'Starter points on account creation'
          }
        }
      );

      user.points = STARTER_POINTS;
      await user.save();
    } catch (creditError) {
      if (welcomeTransaction && welcomeTransaction._id) {
        await PointsTransaction.deleteOne({ _id: welcomeTransaction._id }).catch(() => {});
      }
      await User.findByIdAndDelete(user._id).catch(() => {});
      throw creditError;
    }

    // Create welcome notification without blocking account creation
    try {
      await Notification.createNotification(
        user._id,
        'welcome',
        'Welcome to ReWear!',
        'Thank you for joining our sustainable fashion community. Start by uploading your first item!'
      );
    } catch (_) {
      // Non-fatal notification failure
    }

    const token = generateToken(user._id);

    return {
      user: user.toJSON(),
      token
    };
  }

  // Login user without leaking whether an email exists
  async login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    const isPasswordValid = user ? await user.comparePassword(password) : false;
    if (!user || !isPasswordValid) {
      const authError = new Error('Invalid email or password');
      authError.statusCode = 401;
      throw authError;
    }

    if (user.status !== 'active') {
      const statusError = new Error('Account is not active');
      statusError.statusCode = 403;
      throw statusError;
    }

    const token = generateToken(user._id);

    return {
      user: user.toJSON(),
      token
    };
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      // Only the member-editable fields are applied; anything else in the body
      // (isAdmin, points, status, email, password...) is dropped here.
      const allowedUpdate = pickEditableProfileFields(updateData);

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: allowedUpdate },
        { new: true, runValidators: true }
      );
      if (!user) {
        const notFound = new Error('User not found');
        notFound.statusCode = 404;
        throw notFound;
      }

      return user.toJSON();
    } catch (error) {
      throw toProfileUpdateError(error);
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return { message: 'Password updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get user dashboard data (strictly scoped to caller)
  async getDashboard(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (mongoose.connection.readyState === 1) {
        await swapService.expirePendingSwaps();
      }

      const swapPopulates = [
        { path: 'itemId', select: 'title images pointsValue status size category condition' },
        { path: 'requestedItemId', select: 'title images pointsValue status size category condition' },
        { path: 'requesterId', select: 'firstName lastName username' },
        { path: 'itemOwnerId', select: 'firstName lastName username' }
      ];

      const [
        listedItems,
        totalItemsCount,
        purchasedSwaps,
        recentSwaps,
        swapsNeedingAction,
        openRequests,
        acceptedSwaps,
        completedRaw,
        swapsCompleted,
        itemsReceived,
        totalSwapsCount,
        notifications,
        transactions,
        allTransactions,
        trust
      ] = await Promise.all([
        Item.find({ userId }).sort({ createdAt: -1 }).limit(30),
        Item.countDocuments({ userId }),
        Swap.find({
          requesterId: userId,
          type: 'redeem',
          status: 'accepted'
        })
          .populate('itemId', 'title images status')
          .sort({ createdAt: -1 })
          .limit(5),
        Swap.find({
          $or: [{ requesterId: userId }, { itemOwnerId: userId }]
        })
          .populate(swapPopulates)
          .sort({ createdAt: -1 })
          .limit(5),
        Swap.find({
          itemOwnerId: userId,
          status: 'pending'
        })
          .populate(swapPopulates)
          .sort({ expiresAt: 1, createdAt: -1 })
          .limit(20),
        Swap.find({
          requesterId: userId,
          status: 'pending'
        })
          .populate(swapPopulates)
          .sort({ expiresAt: 1, createdAt: -1 })
          .limit(20),
        Swap.find({
          status: 'accepted',
          $or: [{ requesterId: userId }, { itemOwnerId: userId }]
        })
          .populate(swapPopulates)
          .sort({ updatedAt: -1 })
          .limit(10),
        Swap.find({
          status: 'completed',
          $or: [{ requesterId: userId }, { itemOwnerId: userId }]
        })
          .populate(swapPopulates)
          .sort({ completedAt: -1, updatedAt: -1 })
          .limit(10),
        Swap.countDocuments({
          status: 'completed',
          $or: [{ requesterId: userId }, { itemOwnerId: userId }]
        }),
        Swap.countDocuments({
          status: 'completed',
          $or: [
            { requesterId: userId },
            { itemOwnerId: userId, type: 'swap' }
          ]
        }),
        Swap.countDocuments({
          $or: [{ requesterId: userId }, { itemOwnerId: userId }]
        }),
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(5),
        PointsTransaction.find({ userId }).sort({ createdAt: -1 }).limit(5),
        PointsTransaction.find({ userId }).select('type amount').lean(),
        ratingService.getUserTrustSummary(userId)
      ]);

      const completedIds = completedRaw.map((s) => s._id);
      const callerRatings = completedIds.length > 0
        ? await Rating.find({ swapId: { $in: completedIds }, raterId: userId }).select('swapId').lean()
        : [];
      const ratedSwapIds = new Set(callerRatings.map((r) => String(r.swapId)));

      const completedSwaps = completedRaw.map((swapDoc) => ({
        ...swapDoc.toObject(),
        hasRated: ratedSwapIds.has(String(swapDoc._id))
      }));

      let earnedPoints = 0;
      let rawDebits = 0;
      let refundedPoints = 0;
      for (const tx of allTransactions) {
        const amt = Math.max(0, Number(tx.amount) || 0);
        if (['earned', 'received', 'bonus'].includes(tx.type)) {
          earnedPoints += amt;
        } else if (tx.type === 'refund') {
          refundedPoints += amt;
        } else if (['spent', 'sent', 'penalty', 'hold'].includes(tx.type)) {
          rawDebits += amt;
        }
      }
      const spentPoints = Math.max(0, rawDebits - refundedPoints);

      return {
        user: user.toJSON(),
        stats: {
          itemsCount: totalItemsCount,
          purchasedItemsCount: purchasedSwaps.length,
          activeSwaps: swapsNeedingAction.length + openRequests.length + acceptedSwaps.length,
          swapsCompleted,
          itemsReceived,
          totalSwapsCount,
          unreadNotifications: notifications.filter((n) => !n.isRead).length,
          totalPoints: user.points,
          earnedPoints,
          spentPoints
        },
        trust,
        myItems: listedItems,
        recentItems: listedItems.slice(0, 5),
        purchasedItems: purchasedSwaps
          .filter((swap) => swap.itemId)
          .map((swap) => ({
            ...swap.itemId.toJSON(),
            purchasedAt: swap.createdAt,
            pointsSpent: swap.pointsOffered
          })),
        swapsNeedingAction,
        openRequests,
        acceptedSwaps,
        completedSwaps,
        recentSwaps,
        recentNotifications: notifications,
        recentTransactions: transactions
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify token
  async verifyToken(token) {
    try {
      const { verifyToken } = require('../config/jwt');
      const decoded = verifyToken(token);
      
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }

      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService(); 