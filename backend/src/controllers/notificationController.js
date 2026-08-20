const notificationService = require('../services/notificationService');
const { successResponse, errorResponse, notFoundResponse, paginatedResponse } = require('../utils/response');

class NotificationController {
  // Get user's notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, type, isRead } = req.query;

      const filters = { type, isRead: isRead === 'true' };
      const result = await notificationService.getUserNotifications(userId, parseInt(page), parseInt(limit), filters);

      return paginatedResponse(res, result.notifications, result.pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get notification by ID
  async getNotificationById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const notification = await notificationService.getNotificationById(id, userId);

      return successResponse(res, notification);
    } catch (error) {
      return notFoundResponse(res, error.message);
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const notification = await notificationService.markAsRead(id, userId);

      return successResponse(res, notification, 'Notification marked as read');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user._id;

      const result = await notificationService.markAllAsRead(userId);

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user._id;

      const result = await notificationService.getUnreadCount(userId);

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const result = await notificationService.deleteNotification(id, userId);

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Delete all notifications
  async deleteAllNotifications(req, res) {
    try {
      const userId = req.user._id;

      const result = await notificationService.deleteAllNotifications(userId);

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new NotificationController(); 