const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const { calculateItemPoints } = require('../utils/helpers');
const Notification = require('../models/Notification');
const PointsTransaction = require('../models/PointsTransaction');

class AuthService {
  // Register new user
  async register(userData) {
    try {
      console.log('AuthService register called with:', userData); // Debug log
      
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });
      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new Error('User with this email already exists');
        } else {
          throw new Error('Username already taken');
        }
      }

      // Generate firstName and lastName from username
      const firstName = userData.username.charAt(0).toUpperCase() + userData.username.slice(1);
      const lastName = 'User';

      // Create new user with welcome points
      const user = new User({
        ...userData,
        firstName,
        lastName,
        points: 100 // Give new users 100 welcome points
      });
      console.log('Saving user to database:', user); // Debug log
      await user.save();
      console.log('User saved successfully'); // Debug log

      // Create welcome notification
      try {
        await Notification.createNotification(
          user._id,
          'welcome',
          'Welcome to ReWear!',
          'Thank you for joining our sustainable fashion community. Start by uploading your first item!'
        );
        console.log('Welcome notification created'); // Debug log
      } catch (notificationError) {
        console.error('Failed to create welcome notification:', notificationError); // Debug log
        // Don't fail registration if notification fails
      }

      // Generate token
      const token = generateToken(user._id);
      console.log('Token generated successfully'); // Debug log

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      console.error('AuthService register error:', error); // Debug log
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      console.log('🔍 Looking for user with email:', email); // Debug log
      
      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        console.log('❌ User not found for email:', email); // Debug log
        throw new Error('Invalid email or password');
      }

      console.log('✅ User found:', user.username); // Debug log

      // Check if account is active
      if (user.status !== 'active') {
        console.log('❌ Account not active for:', email); // Debug log
        throw new Error('Account is not active');
      }

      // Verify password
      console.log('🔐 Verifying password for user:', user.username); // Debug log
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', user.username); // Debug log
        throw new Error('Invalid email or password');
      }

      console.log('✅ Password verified for user:', user.username); // Debug log

      // Generate token
      const token = generateToken(user._id);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
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