/**
 * The single list of account fields a member may change about themselves.
 *
 * Both profile-update routes (PUT /api/users/:id and PUT /api/auth/profile)
 * build their update from this helper, so admin rights, points, status, email
 * and password can never be set through them: those have their own guarded
 * flows (admin routes, the points ledger, change-password).
 */

// Top-level and profile fields a member may change on their own account.
const EDITABLE_USER_FIELDS = ['firstName', 'lastName', 'username'];
const EDITABLE_PROFILE_FIELDS = ['bio', 'avatar', 'location'];

/**
 * Copies only the editable fields from a request body into a `$set` object.
 * Values that are not strings are ignored, so an object or array cannot be
 * smuggled into a text field. Profile fields use dot paths (`profile.bio`),
 * which leaves fields that were not sent, such as `profile.joinDate`, intact.
 *
 * @param {object} body the raw request body
 * @returns {object} a `$set`-ready object holding only allowed string fields
 */
const pickEditableProfileFields = (body = {}) => {
  const update = {};
  const source = body && typeof body === 'object' ? body : {};

  for (const field of EDITABLE_USER_FIELDS) {
    if (typeof source[field] === 'string') {
      update[field] = source[field];
    }
  }

  const profile = source.profile && typeof source.profile === 'object' ? source.profile : {};
  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (typeof profile[field] === 'string') {
      update[`profile.${field}`] = profile[field];
    }
  }

  return update;
};

/**
 * Turns a duplicate-key error from a username change into a clear 400 error;
 * any other error is returned unchanged so the caller can decide.
 *
 * @param {Error & {code?: number}} error error thrown by the update
 * @returns {Error & {statusCode?: number}} the error to report
 */
const toProfileUpdateError = (error) => {
  if (error && error.code === 11000) {
    const duplicate = new Error('Username already taken');
    duplicate.statusCode = 400;
    return duplicate;
  }
  return error;
};

module.exports = {
  EDITABLE_USER_FIELDS,
  EDITABLE_PROFILE_FIELDS,
  pickEditableProfileFields,
  toProfileUpdateError
};
