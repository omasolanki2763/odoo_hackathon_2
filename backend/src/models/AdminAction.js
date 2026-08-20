const mongoose = require('mongoose');

const adminActionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['item', 'user', 'swap']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['approve', 'reject', 'suspend', 'ban', 'delete', 'warn', 'activate']
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  details: {
    previousStatus: String,
    newStatus: String,
    notes: {
      type: String,
      maxlength: 1000
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
adminActionSchema.index({ adminId: 1 });
adminActionSchema.index({ targetType: 1, targetId: 1 });
adminActionSchema.index({ action: 1 });
adminActionSchema.index({ createdAt: -1 });

// Method to get action summary
adminActionSchema.methods.getActionSummary = function() {
  return `${this.action} ${this.targetType} - ${this.reason}`;
};

module.exports = mongoose.model('AdminAction', adminActionSchema); 