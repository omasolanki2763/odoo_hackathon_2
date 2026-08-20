const imageService = require('../services/imageService');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');
const path = require('path');
const fs = require('fs');

class UploadController {
  // Upload single image
  async uploadSingle(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file uploaded');
      }

      // Validate file
      imageService.validateImageFile(req.file);

      // Try to upload to Cloudinary, fallback to placeholder if not configured
      let result;
      try {
        result = await imageService.uploadImage(req.file, 'rewear/items');
      } catch (cloudinaryError) {
        console.log('Cloudinary not configured, using placeholder image');
        // Use a more reliable placeholder image service
        const placeholderUrl = `https://dummyimage.com/400x400/7dd3fc/181a1b&text=Item+Image`;
        result = {
          url: placeholderUrl,
          publicId: `placeholder_${Date.now()}`,
          width: 400,
          height: 400,
          size: 'placeholder'
        };
      }

      return createdResponse(res, result, 'Image uploaded successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Upload multiple images
  async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return errorResponse(res, 'No files uploaded');
      }

      // Validate files
      for (const file of req.files) {
        imageService.validateImageFile(file);
      }

      // Try to upload to Cloudinary, fallback to placeholder if not configured
      let results;
      try {
        results = await imageService.uploadMultipleImages(req.files, 'rewear/items');
      } catch (cloudinaryError) {
        console.log('Cloudinary not configured, using placeholder images');
        // Use more reliable placeholder images
        results = req.files.map((file, index) => {
          const placeholderUrl = `https://dummyimage.com/400x400/7dd3fc/181a1b&text=Item+Image+${index + 1}`;
          return {
            url: placeholderUrl,
            publicId: `placeholder_${Date.now()}_${index}`,
            width: 400,
            height: 400,
            size: 'placeholder'
          };
        });
      }

      return createdResponse(res, results, 'Images uploaded successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Delete image
  async deleteImage(req, res) {
    try {
      const { publicId } = req.params;

      const result = await imageService.deleteImage(publicId);

      return successResponse(res, result, 'Image deleted successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new UploadController(); 