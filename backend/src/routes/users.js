const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validation');
const { updateUserValidator, getUserValidator, getUsersValidator } = require('../validators/userValidator');

// Get all users (admin only)
router.get('/', admin, getUsersValidator, validate, userController.getUsers);

// Get user by ID
router.get('/:id', auth, getUserValidator, validate, userController.getUserById);

// Update user
router.put('/:id', auth, updateUserValidator, validate, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', admin, getUserValidator, validate, userController.deleteUser);

// Get user's items
router.get('/:id/items', auth, getUserValidator, validate, userController.getUserItems);

// Get user's swaps
router.get('/:id/swaps', auth, getUserValidator, validate, userController.getUserSwaps);

// Get user's points history
router.get('/:id/points', auth, getUserValidator, validate, userController.getUserPointsHistory);

// Get user's notifications
router.get('/:id/notifications', auth, getUserValidator, validate, userController.getUserNotifications);

module.exports = router; 