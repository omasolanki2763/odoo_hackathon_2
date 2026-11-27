const mongoose = require('mongoose');

const mismatchReportSchema = new mongoose.Schema({
  swapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Swap',
    required: true
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  ratingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating'
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'resolving', 'refunded', 'dismissed'],
    default: 'open'
  },
  pointsPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  refundApplied: {
    type: Number,
    default: 0,
    min: 0
  },
  shortfall: {
    type: Number,
    default: 0,
    min: 0
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

mismatchReportSchema.index({ swapId: 1, reporterId: 1 }, { unique: true });
mismatchReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MismatchReport', mismatchReportSchema);
