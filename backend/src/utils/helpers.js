const crypto = require('crypto');

// Generate random string
const generateRandomString = (length = 8) => {
  return crypto.randomBytes(length).toString('hex');
};

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format date time
const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calculate points for item based on condition and category
const calculateItemPoints = (condition, category) => {
  const conditionMultiplier = {
    'new': 1.0,
    'like-new': 0.9,
    'good': 0.7,
    'fair': 0.5,
    'worn': 0.3
  };

  const categoryBasePoints = {
    'tops': 50,
    'bottoms': 60,
    'dresses': 80,
    'outerwear': 100,
    'shoes': 70,
    'accessories': 30
  };

  const basePoints = categoryBasePoints[category] || 50;
  const multiplier = conditionMultiplier[condition] || 0.5;

  return Math.round(basePoints * multiplier);
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize string for search
const sanitizeSearchString = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
};

// Generate pagination info
const generatePagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate slug from string
const generateSlug = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

module.exports = {
  generateRandomString,
  formatDate,
  formatDateTime,
  calculateItemPoints,
  isValidEmail,
  sanitizeSearchString,
  generatePagination,
  calculateDistance,
  formatFileSize,
  generateSlug
}; 