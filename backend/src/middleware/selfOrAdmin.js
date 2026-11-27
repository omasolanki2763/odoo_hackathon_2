const { forbiddenResponse } = require('../utils/response');

/**
 * Allows the request only when the signed-in member is the one named in
 * `req.params.id`, or is an admin. Must run after the `auth` middleware,
 * which sets `req.user`.
 *
 * @param {import('express').Request} req incoming request (needs req.user and req.params.id)
 * @param {import('express').Response} res response used for the 403
 * @param {import('express').NextFunction} next continues to the route handler
 * @returns {void}
 */
const selfOrAdmin = (req, res, next) => {
  const isOwner = req.user && String(req.user._id) === String(req.params.id);
  const isAdmin = Boolean(req.user && req.user.isAdmin);

  if (!isOwner && !isAdmin) {
    return forbiddenResponse(res, 'Not authorized to access this member');
  }

  return next();
};

module.exports = selfOrAdmin;
