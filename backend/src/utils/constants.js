// Item categories
const ITEM_CATEGORIES = {
  TOPS: 'tops',
  BOTTOMS: 'bottoms',
  DRESSES: 'dresses',
  OUTERWEAR: 'outerwear',
  SHOES: 'shoes',
  ACCESSORIES: 'accessories'
};

// Item conditions
const ITEM_CONDITIONS = {
  NEW: 'new',
  LIKE_NEW: 'like-new',
  GOOD: 'good',
  FAIR: 'fair',
  WORN: 'worn'
};

// Item statuses
const ITEM_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SWAPPED: 'swapped',
  REDEEMED: 'redeemed'
};

// Swap types
const SWAP_TYPES = {
  SWAP: 'swap',
  REDEEM: 'redeem'
};

// Swap statuses
const SWAP_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Handover methods and expiry window
const HANDOVER_METHODS = {
  IN_PERSON: 'in_person',
  POST: 'post'
};

const SWAP_EXPIRY_DAYS = 3;
const SWAP_EXPIRY_MS = SWAP_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Rating and mismatch report rules
const MATCH_STATUSES = {
  YES: 'yes',
  SMALL_DIFFERENCES: 'small_differences',
  NO: 'no'
};

const MISMATCH_STATUSES = {
  OPEN: 'open',
  RESOLVING: 'resolving',
  REFUNDED: 'refunded',
  DISMISSED: 'dismissed'
};

const RATING_VISIBILITY_DAYS = 7;
const RATING_VISIBILITY_MS = RATING_VISIBILITY_DAYS * 24 * 60 * 60 * 1000;
const MISMATCH_REPORT_WINDOW_DAYS = 7;
const MISMATCH_REPORT_WINDOW_MS = MISMATCH_REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// User statuses
const USER_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned'
};

// Notification types
const NOTIFICATION_TYPES = {
  SWAP_REQUEST: 'swap_request',
  SWAP_ACCEPTED: 'swap_accepted',
  SWAP_REJECTED: 'swap_rejected',
  SWAP_COMPLETED: 'swap_completed',
  ITEM_APPROVED: 'item_approved',
  ITEM_REJECTED: 'item_rejected',
  POINTS_RECEIVED: 'points_received',
  POINTS_SPENT: 'points_spent',
  ADMIN_ACTION: 'admin_action',
  WELCOME: 'welcome'
};

// Admin action types
const ADMIN_ACTION_TYPES = {
  APPROVE: 'approve',
  REJECT: 'reject',
  SUSPEND: 'suspend',
  BAN: 'ban',
  DELETE: 'delete',
  WARN: 'warn'
};

// Points transaction types
const POINTS_TRANSACTION_TYPES = {
  EARNED: 'earned',
  SPENT: 'spent',
  RECEIVED: 'received',
  SENT: 'sent',
  BONUS: 'bonus',
  PENALTY: 'penalty',
  HOLD: 'hold',
  REFUND: 'refund'
};

// File upload limits
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50
};

// API response messages
const MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
  DUPLICATE_ENTRY: 'Duplicate entry found',
  INVALID_TOKEN: 'Invalid or expired token',
  INSUFFICIENT_POINTS: 'Insufficient points for this operation',
  ITEM_NOT_AVAILABLE: 'Item is not available for swap',
  SWAP_ALREADY_EXISTS: 'Swap request already exists for this item'
};

// Starter points awarded on new account creation
const STARTER_POINTS = 100;

// HTTP status codes
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Item fit notes (size label system)
const ITEM_FIT_OPTIONS = ['runs-small', 'true', 'runs-large'];

// Measurement field bounds (in cm, except EU/UK shoe sizing)
const MEASUREMENT_FIELD_BOUNDS = {
  chest: { min: 20, max: 250 },
  bust: { min: 20, max: 250 },
  waist: { min: 20, max: 250 },
  length: { min: 5, max: 300 },
  shoulder: { min: 15, max: 120 },
  sleeve: { min: 10, max: 150 },
  inseam: { min: 10, max: 150 },
  rise: { min: 5, max: 80 },
  legOpening: { min: 5, max: 100 },
  width: { min: 1, max: 250 },
  euSize: { min: 15, max: 55 },
  ukSize: { min: 1, max: 20 },
  insoleLength: { min: 10, max: 45 }
};

// Allowed measurement fields per item category
const CATEGORY_MEASUREMENT_FIELDS = {
  [ITEM_CATEGORIES.TOPS]: ['chest', 'length', 'shoulder', 'sleeve'],
  [ITEM_CATEGORIES.OUTERWEAR]: ['chest', 'length', 'shoulder', 'sleeve'],
  [ITEM_CATEGORIES.BOTTOMS]: ['waist', 'inseam', 'rise', 'legOpening'],
  [ITEM_CATEGORIES.DRESSES]: ['bust', 'waist', 'length'],
  [ITEM_CATEGORIES.SHOES]: ['euSize', 'ukSize', 'insoleLength'],
  [ITEM_CATEGORIES.ACCESSORIES]: ['length', 'width']
};

/**
 * Validate category-specific measurements against allowed fields and bounds.
 * Returns null if valid, or a descriptive error message string if invalid.
 */
const validateCategoryMeasurements = (category, measurements) => {
  if (measurements === undefined || measurements === null) return null;
  if (typeof measurements !== 'object' || Array.isArray(measurements)) {
    return 'Measurements must be an object';
  }

  const plain = typeof measurements.toObject === 'function' ? measurements.toObject() : measurements;
  const entries = Object.entries(plain).filter(([key, val]) => key !== '_id' && val !== undefined && val !== null && val !== '');

  if (entries.length === 0) return null;

  const allowedForCategory = category ? CATEGORY_MEASUREMENT_FIELDS[category] : null;
  if (category && !allowedForCategory) {
    return 'Invalid category for measurements';
  }

  for (const [key, value] of entries) {
    if (key === 'unit') {
      if (value !== 'cm' && value !== 'inches') {
        return 'Measurement unit must be cm or inches';
      }
      continue;
    }

    const bounds = MEASUREMENT_FIELD_BOUNDS[key];
    if (!bounds) {
      return `Unknown measurement field "${key}"`;
    }

    if (allowedForCategory && !allowedForCategory.includes(key)) {
      return `Measurement "${key}" is not allowed for category "${category}"`;
    }

    if (typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') {
      return `Measurement "${key}" must be a number`;
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num < bounds.min || num > bounds.max) {
      return `Measurement "${key}" must be between ${bounds.min} and ${bounds.max}`;
    }
  }

  return null;
};

module.exports = {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUSES,
  ITEM_FIT_OPTIONS,
  MEASUREMENT_FIELD_BOUNDS,
  CATEGORY_MEASUREMENT_FIELDS,
  validateCategoryMeasurements,
  SWAP_TYPES,
  SWAP_STATUSES,
  HANDOVER_METHODS,
  SWAP_EXPIRY_DAYS,
  SWAP_EXPIRY_MS,
  MATCH_STATUSES,
  MISMATCH_STATUSES,
  RATING_VISIBILITY_DAYS,
  RATING_VISIBILITY_MS,
  MISMATCH_REPORT_WINDOW_DAYS,
  MISMATCH_REPORT_WINDOW_MS,
  USER_STATUSES,
  NOTIFICATION_TYPES,
  ADMIN_ACTION_TYPES,
  POINTS_TRANSACTION_TYPES,
  STARTER_POINTS,
  UPLOAD_LIMITS,
  PAGINATION,
  MESSAGES,
  STATUS_CODES
};