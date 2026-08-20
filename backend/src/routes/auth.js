const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validation');
const { registerValidator, loginValidator, updateProfileValidator, changePasswordValidator } = require('../validators/authValidator');

// Register new user
router.post('/register', authLimiter, registerValidator, validate, authController.register);

// Login user
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// Get current user profile
router.get('/profile', auth, authController.getProfile);

// Update user profile
router.put('/profile', auth, updateProfileValidator, validate, authController.updateProfile);

// Change password
router.put('/change-password', auth, changePasswordValidator, validate, authController.changePassword);

// Get user dashboard
router.get('/dashboard', auth, authController.getDashboard);

// Verify token
router.get('/verify', authController.verifyToken);

module.exports = router; 