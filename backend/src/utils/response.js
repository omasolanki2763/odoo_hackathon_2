const { STATUS_CODES, MESSAGES } = require('./constants');

// Success response
const successResponse = (res, data = null, message = MESSAGES.SUCCESS, statusCode = STATUS_CODES.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Error response
const errorResponse = (res, message = MESSAGES.SERVER_ERROR, statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

// Not found response
const notFoundResponse = (res, message = MESSAGES.NOT_FOUND) => {
  return errorResponse(res, message, STATUS_CODES.NOT_FOUND);
};

// Bad request response
const badRequestResponse = (res, message = MESSAGES.VALIDATION_ERROR) => {
  return errorResponse(res, message, STATUS_CODES.BAD_REQUEST);
};

// Unauthorized response
const unauthorizedResponse = (res, message = MESSAGES.UNAUTHORIZED) => {
  return errorResponse(res, message, STATUS_CODES.UNAUTHORIZED);
};

// Forbidden response
const forbiddenResponse = (res, message = MESSAGES.FORBIDDEN) => {
  return errorResponse(res, message, STATUS_CODES.FORBIDDEN);
};

// Conflict response
const conflictResponse = (res, message = MESSAGES.DUPLICATE_ENTRY) => {
  return errorResponse(res, message, STATUS_CODES.CONFLICT);
};

// Created response
const createdResponse = (res, data = null, message = 'Resource created successfully') => {
  return successResponse(res, data, message, STATUS_CODES.CREATED);
};

// Paginated response
const paginatedResponse = (res, data, pagination, message = MESSAGES.SUCCESS) => {
  return res.status(STATUS_CODES.OK).json({
    success: true,
    message,
    data,
    pagination
  });
};

module.exports = {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  createdResponse,
  paginatedResponse
}; 