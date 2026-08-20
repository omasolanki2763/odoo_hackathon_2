const cloudinary = require('../config/cloudinary');
const { formatFileSize } = require('../utils/helpers');

class ImageService {
  // Upload single image
  async uploadImage(file, folder = 'rewear') {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Check file size
      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('File size too large. Maximum size is 5MB');
      }

      // Convert buffer to base64
      const base64Image = file.buffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64Image}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        size: formatFileSize(file.size)
      };
    } catch (error) {
      throw error;
    }
  }

  // Upload multiple images
  async uploadMultipleImages(files, folder = 'rewear') {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      if (files.length > 5) {
        throw new Error('Maximum 5 images allowed');
      }

      const uploadPromises = files.map(file => this.uploadImage(file, folder));
      const results = await Promise.all(uploadPromises);

      return results;
    } catch (error) {
      throw error;
    }
  }

  // Delete image from Cloudinary
  async deleteImage(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Delete multiple images
  async deleteMultipleImages(publicIds) {
    try {
      if (!publicIds || publicIds.length === 0) {
        throw new Error('No public IDs provided');
      }

      const deletePromises = publicIds.map(publicId => this.deleteImage(publicId));
      const results = await Promise.all(deletePromises);

      return results;
    } catch (error) {
      throw error;
    }
  }

  // Generate image URL with transformations
  async generateImageUrl(publicId, transformations = {}) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const url = cloudinary.url(publicId, {
        secure: true,
        ...transformations
      });

      return url;
    } catch (error) {
      throw error;
    }
  }

  // Optimize image for different use cases
  async optimizeImage(publicId, useCase = 'thumbnail') {
    try {
      const transformations = {};

      switch (useCase) {
        case 'thumbnail':
          transformations.width = 150;
          transformations.height = 150;
          transformations.crop = 'fill';
          break;
        case 'medium':
          transformations.width = 400;
          transformations.height = 400;
          transformations.crop = 'limit';
          break;
        case 'large':
          transformations.width = 800;
          transformations.height = 800;
          transformations.crop = 'limit';
          break;
        case 'gallery':
          transformations.width = 600;
          transformations.height = 600;
          transformations.crop = 'fill';
          break;
        default:
          transformations.width = 400;
          transformations.height = 400;
          transformations.crop = 'limit';
      }

      return this.generateImageUrl(publicId, transformations);
    } catch (error) {
      throw error;
    }
  }

  // Validate image file
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!file) {
      throw new Error('No file provided');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB');
    }

    return true;
  }

  // Process item images
  async processItemImages(files, isPrimary = false) {
    try {
      if (!files || files.length === 0) {
        throw new Error('At least one image is required');
      }

      const uploadedImages = await this.uploadMultipleImages(files, 'rewear/items');

      // Set first image as primary if not specified
      if (uploadedImages.length > 0 && !isPrimary) {
        uploadedImages[0].isPrimary = true;
      }

      return uploadedImages.map((image, index) => ({
        url: image.url,
        publicId: image.publicId,
        isPrimary: index === 0 && !isPrimary ? true : false,
        width: image.width,
        height: image.height,
        size: image.size
      }));
    } catch (error) {
      throw error;
    }
  }

  // Update item images
  async updateItemImages(itemId, newImages, existingImages = []) {
    try {
      // Delete old images that are no longer needed
      const existingPublicIds = existingImages.map(img => img.publicId);
      const newPublicIds = newImages.map(img => img.publicId);
      const toDelete = existingPublicIds.filter(id => !newPublicIds.includes(id));

      if (toDelete.length > 0) {
        await this.deleteMultipleImages(toDelete);
      }

      return newImages;
    } catch (error) {
      throw error;
    }
  }

  // Get image statistics
  async getImageStats(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        url: result.secure_url,
        createdAt: result.created_at
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ImageService(); 