const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories']
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  condition: {
    type: String,
    required: true,
    enum: ['new', 'like-new', 'good', 'fair', 'worn']
  },
  gender: {
    type: String,
    required: true,
    enum: ['men', 'women', 'unisex']
  },
  ageGroup: {
    type: String,
    enum: ['kids', 'teens', 'adults'],
    default: 'adults'
  },
  season: [{
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter']
  }],
  style: [{
    type: String,
    enum: ['casual', 'formal', 'vintage', 'sporty', 'elegant', 'streetwear', 'bohemian', 'minimalist']
  }],
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  measurements: {
    chest: Number,
    waist: Number,
    length: Number,
    unit: {
      type: String,
      enum: ['cm', 'inches'],
      default: 'cm'
    }
  },
  pointsValue: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'available', 'swapped', 'redeemed'],
    default: 'pending'
  },
  location: {
    city: String,
    state: String,
    country: String
  },
  swapHistory: [{
    swapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Swap'
    },
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['swap', 'redeem']
    }
  }],
  adminNotes: String
}, {
  timestamps: true
});

// Indexes for better query performance
itemSchema.index({ userId: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ tags: 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ pointsValue: 1 });

// Virtual for primary image
itemSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

// Method to add to swap history
itemSchema.methods.addToSwapHistory = function(swapId, type) {
  this.swapHistory.push({ swapId, type });
  return this.save();
};

// Method to check if item is available
itemSchema.methods.isAvailable = function() {
  return this.status === 'available';
};

module.exports = mongoose.model('Item', itemSchema); 