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
  CANCELLED: 'cancelled'
};

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
  PENALTY: 'penalty'
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

module.exports = {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUSES,
  SWAP_TYPES,
  SWAP_STATUSES,
  USER_STATUSES,
  NOTIFICATION_TYPES,
  ADMIN_ACTION_TYPES,
  POINTS_TRANSACTION_TYPES,
  UPLOAD_LIMITS,
  PAGINATION,
  MESSAGES,
  STATUS_CODES
}; 