const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  profile: {
    bio: {
      type: String,
      maxlength: 500
    },
    avatar: String,
    location: String,
    joinDate: {
      type: Date,
      default: Date.now
    }
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  stats: {
    itemsUploaded: {
      type: Number,
      default: 0
    },
    swapsCompleted: {
      type: Number,
      default: 0
    },
    itemsReceived: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    categories: [String],
    sizes: [String],
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate firstName and lastName if not provided
userSchema.pre('save', function(next) {
  if (!this.firstName && this.username) {
    this.firstName = this.username.charAt(0).toUpperCase() + this.username.slice(1);
  }
  if (!this.lastName) {
    this.lastName = 'User';
  }
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || this.username} ${this.lastName || ''}`;
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema); 