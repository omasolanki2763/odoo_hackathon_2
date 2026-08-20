const itemService = require('../services/itemService');
const imageService = require('../services/imageService');
const { successResponse, errorResponse, notFoundResponse, createdResponse, paginatedResponse } = require('../utils/response');

class ItemController {
  // Get all items with filtering
  async getItems(req, res) {
    try {
      const { page = 1, limit = 10, category, condition, gender, size, minPoints, maxPoints, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const filters = {
        category,
        condition,
        gender,
        size,
        minPoints: parseInt(minPoints),
        maxPoints: parseInt(maxPoints),
        search
      };

      const result = await itemService.getItems(filters, parseInt(page), parseInt(limit));

      return paginatedResponse(res, result.items, result.pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get featured items
  async getFeaturedItems(req, res) {
    try {
      const items = await itemService.getFeaturedItems();
      return successResponse(res, items);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Search items
  async searchItems(req, res) {
    try {
      const { q: searchTerm, page = 1, limit = 10, category, condition, gender } = req.query;

      if (!searchTerm) {
        return errorResponse(res, 'Search term is required');
      }

      const filters = { category, condition, gender };
      const result = await itemService.searchItems(searchTerm, filters, parseInt(page), parseInt(limit));

      return paginatedResponse(res, result.items, result.pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get item by ID
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      const item = await itemService.getItemById(id);

      return successResponse(res, item);
    } catch (error) {
      return notFoundResponse(res, error.message);
    }
  }

  // Create new item
  async createItem(req, res) {
    try {
      const userId = req.user._id;
      const itemData = req.body;

      // Process uploaded images
      if (req.files && req.files.length > 0) {
        const images = await imageService.processItemImages(req.files);
        itemData.images = images;
      }

      const item = await itemService.createItem(userId, itemData);

      return createdResponse(res, item, 'Item created successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Update item
  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const updateData = req.body;

      // Process new images if uploaded
      if (req.files && req.files.length > 0) {
        const newImages = await imageService.processItemImages(req.files);
        updateData.images = newImages;
      }

      const item = await itemService.updateItem(id, userId, updateData);

      return successResponse(res, item, 'Item updated successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Delete item
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const result = await itemService.deleteItem(id, userId);

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user's items
  async getMyItems(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      const result = await itemService.getUserItems(userId, parseInt(page), parseInt(limit));

      return paginatedResponse(res, result.items, result.pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Approve item (admin)
  async approveItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;

      const item = await itemService.approveItem(id, adminId);

      return successResponse(res, item, 'Item approved successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Reject item (admin)
  async rejectItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      const item = await itemService.rejectItem(id, adminId, reason);

      return successResponse(res, item, 'Item rejected successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get pending items (admin)
  async getPendingItems(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const Item = require('../models/Item');
      const skip = (page - 1) * limit;

      const items = await Item.find({ status: 'pending' })
        .populate('userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Item.countDocuments({ status: 'pending' });
      const pagination = {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      };

      return paginatedResponse(res, items, pagination);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new ItemController(); 