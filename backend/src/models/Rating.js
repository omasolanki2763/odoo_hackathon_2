const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  swapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Swap',
    required: true
  },
  raterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rateeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stars: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Stars must be an integer between 1 and 5'
    }
  },
  matchStatus: {
    type: String,
    required: true,
    enum: ['yes', 'small_differences', 'no']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// One rating per participant per completed swap
ratingSchema.index({ swapId: 1, raterId: 1 }, { unique: true });
ratingSchema.index({ rateeId: 1, createdAt: -1 });
ratingSchema.index({ swapId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
