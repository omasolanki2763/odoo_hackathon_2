const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validation');
const selfOrAdmin = require('../middleware/selfOrAdmin');
const { updateUserValidator, getUserValidator, getUsersValidator } = require('../validators/userValidator');

// Get all users (admin only)
router.get('/', admin, getUsersValidator, validate, userController.getUsers);

// Public member profile by username (never exposes private fields; must precede /:id)
router.get('/:username/public', userController.getPublicProfile);

// Get user by ID
router.get('/:id', auth, getUserValidator, validate, selfOrAdmin, userController.getUserById);

// Update user
router.put('/:id', auth, updateUserValidator, validate, selfOrAdmin, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', admin, getUserValidator, validate, userController.deleteUser);

// Get user's items
router.get('/:id/items', auth, getUserValidator, validate, selfOrAdmin, userController.getUserItems);

// Get user's swaps
router.get('/:id/swaps', auth, getUserValidator, validate, selfOrAdmin, userController.getUserSwaps);

// Get user's points history
router.get('/:id/points', auth, getUserValidator, validate, selfOrAdmin, userController.getUserPointsHistory);

// Get user's notifications
router.get('/:id/notifications', auth, getUserValidator, validate, selfOrAdmin, userController.getUserNotifications);

module.exports = router; 