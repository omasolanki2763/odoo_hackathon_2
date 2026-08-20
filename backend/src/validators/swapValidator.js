const { body, param, query } = require('express-validator');
const { SWAP_TYPES, SWAP_STATUSES } = require('../utils/constants');

const createSwapValidator = [
  body('itemId')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('type')
    .isIn(Object.values(SWAP_TYPES))
    .withMessage('Invalid swap type'),
  
  body('requestedItemId')
    .optional()
    .isMongoId()
    .withMessage('Invalid requested item ID'),
  
  body('pointsOffered')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Points offered must be a non-negative integer'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

const updateSwapValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid swap ID'),
  
  body('status')
    .isIn(Object.values(SWAP_STATUSES))
    .withMessage('Invalid swap status'),
  
  body('response.message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Response message must be less than 500 characters')
];

const getSwapsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('status')
    .optional()
    .isIn(Object.values(SWAP_STATUSES))
    .withMessage('Invalid status'),
  
  query('type')
    .optional()
    .isIn(Object.values(SWAP_TYPES))
    .withMessage('Invalid type'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const getSwapValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid swap ID')
];

module.exports = {
  createSwapValidator,
  updateSwapValidator,
  getSwapsValidator,
  getSwapValidator
}; 