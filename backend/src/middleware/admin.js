const auth = require('./auth');

const admin = async (req, res, next) => {
  try {
    // First authenticate the user
    await auth(req, res, (err) => {
      if (err) return next(err);
    });

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in admin middleware.'
    });
  }
};

module.exports = admin; 