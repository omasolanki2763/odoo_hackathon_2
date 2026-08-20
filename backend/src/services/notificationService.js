const Notification = require('../models/Notification');
const { generatePagination } = require('../utils/helpers');

class NotificationService {
  // Create notification
  async createNotification(userId, type, title, message, data = {}) {
    try {
      const notification = await Notification.createNotification(
        userId,
        type,
        title,
        message,
        data
      );

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Get user's notifications
  async getUserNotifications(userId, page = 1, limit = 10, filters = {}) {
    try {
      const query = { userId };

      // Apply filters
      if (filters.type) query.type = filters.type;
      if (filters.isRead !== undefined) query.isRead = filters.isRead;

      const skip = (page - 1) * limit;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments(query);
      const pagination = generatePagination(page, limit, total);

      return { notifications, pagination };
    } catch (error) {
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Check ownership
      if (notification.userId.toString() !== userId) {
        throw new Error('Not authorized to mark this notification as read');
      }

      await notification.markAsRead();
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );

      return { message: 'All notifications marked as read' };
    } catch (error) {
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false
      });

      return { unreadCount: count };
    } catch (error) {
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Check ownership
      if (notification.userId.toString() !== userId) {
        throw new Error('Not authorized to delete this notification');
      }

      await Notification.findByIdAndDelete(notificationId);
      return { message: 'Notification deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Delete all notifications
  async deleteAllNotifications(userId) {
    try {
      await Notification.deleteMany({ userId });
      return { message: 'All notifications deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get notification by ID
  async getNotificationById(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Check ownership
      if (notification.userId.toString() !== userId) {
        throw new Error('Not authorized to view this notification');
      }

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Create system notification
  async createSystemNotification(userIds, type, title, message, data = {}) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        const notification = await Notification.createNotification(
          userId,
          type,
          title,
          message,
          data
        );
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unreadCount: {
              $sum: {
                $cond: [{ $eq: ['$isRead', false] }, 1, 0]
              }
            }
          }
        }
      ]);

      const totalCount = await Notification.countDocuments({ userId });
      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false
      });

      return {
        totalCount,
        unreadCount,
        byType: stats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new NotificationService(); 