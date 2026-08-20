const mongoose = require('mongoose');

const pointsTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['earned', 'spent', 'received', 'sent', 'bonus', 'penalty']
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  relatedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  relatedSwapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Swap'
  },
  metadata: {
    source: String, // 'item_upload', 'swap_completion', 'admin_action', etc.
    reason: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
pointsTransactionSchema.index({ userId: 1, createdAt: -1 });
pointsTransactionSchema.index({ type: 1 });
pointsTransactionSchema.index({ relatedItemId: 1 });
pointsTransactionSchema.index({ relatedSwapId: 1 });

// Method to get transaction summary
pointsTransactionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    amount: this.amount,
    balance: this.balance,
    description: this.description,
    createdAt: this.createdAt,
    relatedItemId: this.relatedItemId,
    relatedSwapId: this.relatedSwapId
  };
};

// Static method to create transaction
pointsTransactionSchema.statics.createTransaction = function(userId, type, amount, description, options = {}) {
  return this.create({
    userId,
    type,
    amount,
    description,
    balance: options.balance,
    relatedItemId: options.relatedItemId,
    relatedSwapId: options.relatedSwapId,
    metadata: options.metadata
  });
};

// Virtual for formatted amount
pointsTransactionSchema.virtual('formattedAmount').get(function() {
  const sign = this.type === 'earned' || this.type === 'received' || this.type === 'bonus' ? '+' : '-';
  return `${sign}${this.amount}`;
});

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema); 