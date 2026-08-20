const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swapController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validation');
const { createSwapValidator, updateSwapValidator, getSwapsValidator, getSwapValidator } = require('../validators/swapValidator');
const { body } = require('express-validator');

// Get user's swaps (authenticated)
router.get('/', auth, getSwapsValidator, validate, swapController.getUserSwaps);

// Get swap by ID (authenticated)
router.get('/:id', auth, getSwapValidator, validate, swapController.getSwapById);

// Create swap request (authenticated)
router.post('/', auth, createSwapValidator, validate, swapController.createSwap);

// Redeem item with points (authenticated)
router.post('/redeem', auth, [
  body('itemId')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('pointsOffered')
    .isInt({ min: 1 })
    .withMessage('Points offered must be a positive integer'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
], validate, swapController.redeemItem);

// Direct redemption - immediate purchase (authenticated)
router.post('/redeem/direct', auth, [
  body('itemId')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('pointsOffered')
    .isInt({ min: 1 })
    .withMessage('Points offered must be a positive integer')
], validate, swapController.directRedeem);

// Accept swap request (authenticated)
router.put('/:id/accept', auth, getSwapValidator, validate, swapController.acceptSwap);

// Reject swap request (authenticated)
router.put('/:id/reject', auth, getSwapValidator, validate, swapController.rejectSwap);

// Complete swap (authenticated)
router.put('/:id/complete', auth, getSwapValidator, validate, swapController.completeSwap);

// Cancel swap (authenticated)
router.put('/:id/cancel', auth, getSwapValidator, validate, swapController.cancelSwap);

module.exports = router; 