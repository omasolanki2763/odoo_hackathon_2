const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const admin = require('../middleware/admin');

// Get admin dashboard stats
router.get('/dashboard', admin, adminController.getDashboard);

// Get pending items for moderation
router.get('/items/pending', admin, adminController.getPendingItems);

// Get all items (admin view)
router.get('/items', admin, adminController.getAllItems);

// Get all users (admin view)
router.get('/users', admin, adminController.getUsers);

// Get all swaps (admin view)
router.get('/swaps', admin, adminController.getSwaps);

// Get admin actions log
router.get('/actions', admin, adminController.getAdminActions);

// Approve item
router.put('/items/:id/approve', admin, adminController.approveItem);

// Reject item
router.put('/items/:id/reject', admin, adminController.rejectItem);

// Delete item
router.delete('/items/:id', admin, adminController.deleteItem);

// Suspend user
router.put('/users/:id/suspend', admin, adminController.suspendUser);

// Activate user
router.put('/users/:id/activate', admin, adminController.activateUser);

// Ban user
router.put('/users/:id/ban', admin, adminController.banUser);

// Award bonus points
router.post('/users/:id/points/bonus', admin, adminController.awardBonusPoints);

// Apply penalty points
router.post('/users/:id/points/penalty', admin, adminController.applyPenalty);

// Get system statistics
router.get('/stats', admin, adminController.getSystemStats);

module.exports = router; 