const mongoose = require('mongoose');

const swapSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['swap', 'redeem']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  requestedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  pointsOffered: {
    type: Number,
    min: 0
  },
  message: {
    type: String,
    maxlength: 500
  },
  response: {
    message: {
      type: String,
      maxlength: 500
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  timeline: [{
    action: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: String
  }],
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
swapSchema.index({ requesterId: 1 });
swapSchema.index({ itemOwnerId: 1 });
swapSchema.index({ itemId: 1 });
swapSchema.index({ status: 1 });
swapSchema.index({ createdAt: -1 });

// Method to add timeline entry
swapSchema.methods.addTimelineEntry = function(action, userId, details = '') {
  this.timeline.push({
    action,
    userId,
    details
  });
  return this.save();
};

// Method to update status
swapSchema.methods.updateStatus = function(newStatus, userId, details = '') {
  this.status = newStatus;
  this.addTimelineEntry(`Status changed to ${newStatus}`, userId, details);
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Virtual for is active
swapSchema.virtual('isActive').get(function() {
  return ['pending', 'accepted'].includes(this.status);
});

// Pre-save middleware to add initial timeline entry
swapSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timeline.push({
      action: 'Swap request created',
      userId: this.requesterId,
      details: `Requested ${this.type}`
    });
  }
  next();
});

module.exports = mongoose.model('Swap', swapSchema); 