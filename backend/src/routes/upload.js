const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Upload single image
router.post('/single', auth, uploadLimiter, uploadSingle, uploadController.uploadSingle);

// Upload multiple images
router.post('/multiple', auth, uploadLimiter, uploadMultiple, uploadController.uploadMultiple);

// Test upload endpoint (for debugging)
router.post('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Upload endpoint is working',
    data: { url: 'https://via.placeholder.com/400x400/7dd3fc/181a1b?text=Test+Image' }
  });
});

// Delete image
router.delete('/:publicId', auth, uploadController.deleteImage);

module.exports = router; 