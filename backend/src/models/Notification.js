const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'swap_request',
      'swap_accepted',
      'swap_rejected',
      'swap_completed',
      'item_approved',
      'item_rejected',
      'points_received',
      'points_spent',
      'admin_action',
      'welcome'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    swapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Swap'
    },
    points: Number,
    actionType: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to get notification summary
notificationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    isRead: this.isRead,
    createdAt: this.createdAt,
    data: this.data
  };
};

// Static method to create notification
notificationSchema.statics.createNotification = function(userId, type, title, message, data = {}) {
  return this.create({
    userId,
    type,
    title,
    message,
    data
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 