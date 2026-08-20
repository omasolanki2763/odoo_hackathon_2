const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validation');
const { uploadMultiple } = require('../middleware/upload');
const { createItemValidator, updateItemValidator, getItemsValidator, getItemValidator } = require('../validators/itemValidator');

// Get all items (public)
router.get('/', getItemsValidator, validate, itemController.getItems);

// Get featured items (public)
router.get('/featured', itemController.getFeaturedItems);

// Search items (public)
router.get('/search', getItemsValidator, validate, itemController.searchItems);

// Get item by ID (public)
router.get('/:id', getItemValidator, validate, itemController.getItemById);

// Create new item (authenticated)
router.post('/', auth, uploadMultiple, createItemValidator, validate, itemController.createItem);

// Update item (authenticated)
router.put('/:id', auth, updateItemValidator, validate, itemController.updateItem);

// Delete item (authenticated)
router.delete('/:id', auth, getItemValidator, validate, itemController.deleteItem);

// Get user's items (authenticated)
router.get('/user/me', auth, itemController.getMyItems);

// Admin routes
// Approve item (admin only)
router.put('/:id/approve', admin, getItemValidator, validate, itemController.approveItem);

// Reject item (admin only)
router.put('/:id/reject', admin, getItemValidator, validate, itemController.rejectItem);

// Get pending items (admin only)
router.get('/admin/pending', admin, itemController.getPendingItems);

module.exports = router; 