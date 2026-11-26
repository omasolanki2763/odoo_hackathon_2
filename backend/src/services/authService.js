const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const Notification = require('../models/Notification');
const PointsTransaction = require('../models/PointsTransaction');
const { POINTS_TRANSACTION_TYPES, STARTER_POINTS } = require('../utils/constants');

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
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user
      Object.assign(user, updateData);
      await user.save();

      return user.toJSON();
    } catch (error) {
      throw error;
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

  // Get user dashboard data
  async getDashboard(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's listed items
      const Item = require('../models/Item');
      const listedItems = await Item.find({ userId }).sort({ createdAt: -1 }).limit(5);

      // Get items the user has purchased/redeemed (items with status 'redeemed' where user is the redeemer)
      const Swap = require('../models/Swap');
      const purchasedSwaps = await Swap.find({
        requesterId: userId,
        type: 'redeem',
        status: 'accepted'
      })
      .populate('itemId', 'title images status')
      .sort({ createdAt: -1 })
      .limit(5);

      // Get recent swaps
      const swaps = await Swap.find({
        $or: [{ requesterId: userId }, { itemOwnerId: userId }]
      })
      .populate('itemId', 'title images')
      .populate('requesterId', 'firstName lastName username')
      .populate('itemOwnerId', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(5);

      // Get recent notifications
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      // Get recent points transactions
      const transactions = await PointsTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      return {
        user: user.toJSON(),
        stats: {
          itemsCount: listedItems.length,
          purchasedItemsCount: purchasedSwaps.length,
          activeSwaps: swaps.filter(s => s.status === 'pending' || s.status === 'accepted').length,
          unreadNotifications: notifications.filter(n => !n.isRead).length,
          totalPoints: user.points
        },
        recentItems: listedItems,
        purchasedItems: purchasedSwaps.map(swap => ({
          ...swap.itemId.toJSON(),
          purchasedAt: swap.createdAt,
          pointsSpent: swap.pointsOffered
        })),
        recentSwaps: swaps,
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