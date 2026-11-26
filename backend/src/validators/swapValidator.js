const { body, param, query } = require('express-validator');
const { SWAP_TYPES, SWAP_STATUSES, HANDOVER_METHODS } = require('../utils/constants');

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

  body('handoverMethod')
    .custom((value, { req }) => {
      if (req.body.type === SWAP_TYPES.SWAP) {
        if (!value || !Object.values(HANDOVER_METHODS).includes(value)) {
          throw new Error('Handover method must be in_person or post');
        }
      } else if (value !== undefined && !Object.values(HANDOVER_METHODS).includes(value)) {
        throw new Error('Handover method must be in_person or post');
      }
      return true;
    }),

  body('handoverNote')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Handover note must be 300 characters or fewer'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

const quoteValidator = [
  query('item')
    .isMongoId()
    .withMessage('Valid target item ID is required'),

  query('offer')
    .optional()
    .isMongoId()
    .withMessage('Invalid offered item ID'),

  query('topUp')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Top-up must be a non-negative integer')
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

  query('direction')
    .optional()
    .isIn(['sent', 'received'])
    .withMessage('Direction must be sent or received'),

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
  quoteValidator,
  updateSwapValidator,
  getSwapsValidator,
  getSwapValidator
};
