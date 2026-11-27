/**
 * Query validators for the signed-in member's points history endpoint.
 *
 * The whitelist rejects every key the endpoint does not read, so a typo or a
 * probing parameter never silently changes the query the service builds.
 */

const { query } = require('express-validator');
const { POINTS_TRANSACTION_TYPES } = require('../utils/constants');
const { createQueryWhitelistValidator } = require('./itemValidator');

const ALLOWED_POINTS_QUERY_KEYS = new Set(['page', 'limit', 'type']);

const whitelistPointsQuery = createQueryWhitelistValidator(ALLOWED_POINTS_QUERY_KEYS);

const TRANSACTION_TYPES = Object.values(POINTS_TRANSACTION_TYPES);

const getMyPointsQueryValidator = [
  whitelistPointsQuery,

  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Limit must be a positive integer'),

  query('type')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string') {
        throw new Error('Type filter must be a comma-separated string');
      }
      const types = value
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
      if (types.length === 0 || types.length > TRANSACTION_TYPES.length) {
        throw new Error('Type filter must contain at least one known transaction type');
      }
      if (!types.every((type) => TRANSACTION_TYPES.includes(type))) {
        throw new Error('Type filter contains an unknown transaction type');
      }
      return true;
    })
];

module.exports = {
  getMyPointsQueryValidator,
  ALLOWED_POINTS_QUERY_KEYS
};
