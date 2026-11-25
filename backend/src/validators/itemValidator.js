const { body, param, query } = require('express-validator');
const {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUSES,
  ITEM_FIT_OPTIONS,
  PAGINATION,
  validateCategoryMeasurements
} = require('../utils/constants');

const ALLOWED_GENDERS = ['men', 'women', 'unisex'];
const ALLOWED_SORT_MODES = ['newest', 'points_asc', 'points_desc'];
const ALLOWED_GET_ITEMS_QUERY_KEYS = new Set([
  'page',
  'limit',
  'category',
  'condition',
  'gender',
  'size',
  'minPoints',
  'maxPoints',
  'colour',
  'material',
  'brand',
  'search',
  'sort',
  'sortBy',
  'sortOrder'
]);

const ALLOWED_SEARCH_ITEMS_QUERY_KEYS = new Set([
  'q',
  'page',
  'limit',
  'category',
  'condition',
  'gender'
]);

const splitCommaList = (rawValue) =>
  rawValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const ensureStringQueryParam = (field) =>
  query(field)
    .optional()
    .custom((value) => {
      if (typeof value !== 'string') {
        throw new Error(`${field} must be a plain string`);
      }
      return true;
    });

const validateCommaSeparatedEnum = (field, allowedValues, label) =>
  ensureStringQueryParam(field).custom((value) => {
    const tokens = splitCommaList(value);
    if (tokens.length === 0 || tokens.length > 10) {
      throw new Error(`Invalid ${label}`);
    }
    const allowedSet = new Set(allowedValues);
    if (!tokens.every((token) => allowedSet.has(token))) {
      throw new Error(`Invalid ${label}`);
    }
    return true;
  });

const validateCommaSeparatedStrings = (field, maxLength, label) =>
  ensureStringQueryParam(field).custom((value) => {
    const tokens = splitCommaList(value);
    if (tokens.length === 0 || tokens.length > 10) {
      throw new Error(`Invalid ${label}`);
    }
    if (!tokens.every((token) => token.length >= 1 && token.length <= maxLength)) {
      throw new Error(`${label} values must be between 1 and ${maxLength} characters`);
    }
    return true;
  });

const createQueryWhitelistValidator = (allowedKeys) => (req, res, next) => {
  const keys = Object.keys(req.query || {});
  const badErrors = [];

  for (const key of keys) {
    if (!allowedKeys.has(key) || key.startsWith('$')) {
      badErrors.push({
        field: key,
        message: 'Unknown or disallowed query parameter',
        value: req.query[key]
      });
      continue;
    }

    if (typeof req.query[key] !== 'string') {
      badErrors.push({
        field: key,
        message: 'Query parameter must be a string',
        value: req.query[key]
      });
    }
  }

  if (badErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: badErrors
    });
  }

  return next();
};

const whitelistGetItemsQuery = createQueryWhitelistValidator(ALLOWED_GET_ITEMS_QUERY_KEYS);
const whitelistSearchItemsQuery = createQueryWhitelistValidator(ALLOWED_SEARCH_ITEMS_QUERY_KEYS);

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
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must be less than 50 characters'),

  body('colour')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Colour must be less than 40 characters'),

  body('material')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Material must be less than 60 characters'),
  
  body('size')
    .trim()
    .notEmpty()
    .withMessage('Size is required'),

  body('fit')
    .optional()
    .isIn(ITEM_FIT_OPTIONS)
    .withMessage('Fit must be runs-small, true, or runs-large'),
  
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
  
  body('measurements')
    .optional()
    .custom((value, { req }) => {
      const errMsg = validateCategoryMeasurements(req.body.category, value);
      if (errMsg) {
        throw new Error(errMsg);
      }
      return true;
    }),
  
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
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must be less than 50 characters'),

  body('colour')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Colour must be less than 40 characters'),

  body('material')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Material must be less than 60 characters'),
  
  body('size')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Size cannot be empty'),

  body('fit')
    .optional()
    .isIn(ITEM_FIT_OPTIONS)
    .withMessage('Fit must be runs-small, true, or runs-large'),

  body('measurements')
    .optional()
    .custom((value, { req }) => {
      const errMsg = validateCategoryMeasurements(req.body.category || null, value);
      if (errMsg) {
        throw new Error(errMsg);
      }
      return true;
    }),
  
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

const sharedFilterFieldValidators = [
  ensureStringQueryParam('page')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a positive integer'),

  ensureStringQueryParam('limit')
    .isInt({ min: 1, max: PAGINATION.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${PAGINATION.MAX_LIMIT}`),

  validateCommaSeparatedEnum('category', Object.values(ITEM_CATEGORIES), 'category'),

  validateCommaSeparatedEnum('condition', Object.values(ITEM_CONDITIONS), 'condition'),

  validateCommaSeparatedEnum('gender', ALLOWED_GENDERS, 'gender')
];

const getItemsValidator = [
  whitelistGetItemsQuery,

  ...sharedFilterFieldValidators,

  validateCommaSeparatedStrings('size', 20, 'size'),

  validateCommaSeparatedStrings('colour', 40, 'colour'),

  validateCommaSeparatedStrings('material', 40, 'material'),

  ensureStringQueryParam('brand')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Brand must be between 1 and 50 characters'),

  ensureStringQueryParam('minPoints')
    .matches(/^\d+$/)
    .isInt({ min: 0, max: 100000 })
    .withMessage('Min points must be a non-negative integer'),

  ensureStringQueryParam('maxPoints')
    .matches(/^\d+$/)
    .isInt({ min: 0, max: 100000 })
    .withMessage('Max points must be a non-negative integer')
    .custom((value, { req }) => {
      if (req.query.minPoints !== undefined) {
        const min = parseInt(req.query.minPoints, 10);
        const max = parseInt(value, 10);
        if (min > max) {
          throw new Error('maxPoints must be greater than or equal to minPoints');
        }
      }
      return true;
    }),

  ensureStringQueryParam('search')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  ensureStringQueryParam('sort')
    .isIn(ALLOWED_SORT_MODES)
    .withMessage('Invalid sort mode'),

  ensureStringQueryParam('sortBy')
    .isIn(['createdAt', 'pointsValue', 'title'])
    .withMessage('Invalid sort field'),

  ensureStringQueryParam('sortOrder')
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const searchItemsValidator = [
  whitelistSearchItemsQuery,

  query('q')
    .custom((value) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Search term q is required');
      }
      return true;
    })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  ...sharedFilterFieldValidators
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
  searchItemsValidator,
  getItemValidator
}; 