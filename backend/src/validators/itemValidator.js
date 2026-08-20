const { body, param, query } = require('express-validator');
const { ITEM_CATEGORIES, ITEM_CONDITIONS, ITEM_STATUSES } = require('../utils/constants');

const createItemValidator = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .isIn(Object.values(ITEM_CATEGORIES))
    .withMessage('Invalid category'),
  
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subcategory must be less than 50 characters'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must be less than 50 characters'),
  
  body('size')
    .trim()
    .notEmpty()
    .withMessage('Size is required'),
  
  body('condition')
    .isIn(Object.values(ITEM_CONDITIONS))
    .withMessage('Invalid condition'),
  
  body('gender')
    .isIn(['men', 'women', 'unisex'])
    .withMessage('Invalid gender'),
  
  body('ageGroup')
    .optional()
    .isIn(['kids', 'teens', 'adults'])
    .withMessage('Invalid age group'),
  
  body('season')
    .optional()
    .isArray()
    .withMessage('Season must be an array'),
  
  body('season.*')
    .optional()
    .isIn(['spring', 'summer', 'fall', 'winter'])
    .withMessage('Invalid season'),
  
  body('style')
    .optional()
    .isArray()
    .withMessage('Style must be an array'),
  
  body('style.*')
    .optional()
    .isIn(['casual', 'formal', 'vintage', 'sporty', 'elegant', 'streetwear', 'bohemian', 'minimalist'])
    .withMessage('Invalid style'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Each tag must be between 1 and 20 characters'),
  
  body('measurements.chest')
    .optional()
    .isNumeric()
    .withMessage('Chest measurement must be a number'),
  
  body('measurements.waist')
    .optional()
    .isNumeric()
    .withMessage('Waist measurement must be a number'),
  
  body('measurements.length')
    .optional()
    .isNumeric()
    .withMessage('Length measurement must be a number'),
  
  body('measurements.unit')
    .optional()
    .isIn(['cm', 'inches'])
    .withMessage('Measurement unit must be cm or inches'),
  
  body('pointsValue')
    .isInt({ min: 1 })
    .withMessage('Points value must be a positive integer'),
  
  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must be less than 50 characters'),
  
  body('location.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must be less than 50 characters'),
  
  body('location.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must be less than 50 characters')
];

const updateItemValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .optional()
    .isIn(Object.values(ITEM_CATEGORIES))
    .withMessage('Invalid category'),
  
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subcategory must be less than 50 characters'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must be less than 50 characters'),
  
  body('size')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Size cannot be empty'),
  
  body('condition')
    .optional()
    .isIn(Object.values(ITEM_CONDITIONS))
    .withMessage('Invalid condition'),
  
  body('gender')
    .optional()
    .isIn(['men', 'women', 'unisex'])
    .withMessage('Invalid gender'),
  
  body('ageGroup')
    .optional()
    .isIn(['kids', 'teens', 'adults'])
    .withMessage('Invalid age group'),
  
  body('season')
    .optional()
    .isArray()
    .withMessage('Season must be an array'),
  
  body('style')
    .optional()
    .isArray()
    .withMessage('Style must be an array'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('pointsValue')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Points value must be a positive integer'),
  
  body('status')
    .optional()
    .isIn(Object.values(ITEM_STATUSES))
    .withMessage('Invalid status')
];

const getItemsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('category')
    .optional()
    .isIn(Object.values(ITEM_CATEGORIES))
    .withMessage('Invalid category'),
  
  query('condition')
    .optional()
    .isIn(Object.values(ITEM_CONDITIONS))
    .withMessage('Invalid condition'),
  
  query('gender')
    .optional()
    .isIn(['men', 'women', 'unisex'])
    .withMessage('Invalid gender'),
  
  query('size')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Size cannot be empty'),
  
  query('minPoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min points must be a non-negative integer'),
  
  query('maxPoints')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max points must be a non-negative integer'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'pointsValue', 'title'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const getItemValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid item ID')
];

module.exports = {
  createItemValidator,
  updateItemValidator,
  getItemsValidator,
  getItemValidator
}; 