const Item = require('../models/Item');
const User = require('../models/User');
const { calculateItemPoints } = require('../utils/helpers');
const { generatePagination } = require('../utils/helpers');
const Notification = require('../models/Notification');

class ItemService {
  // Create new item
  async createItem(userId, itemData) {
    try {
      // Calculate points value if not provided
      if (!itemData.pointsValue) {
        itemData.pointsValue = calculateItemPoints(itemData.condition, itemData.category);
      }

      // Create item
      const item = new Item({
        ...itemData,
        userId
      });

      await item.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.itemsUploaded': 1 }
      });

      return item;
    } catch (error) {
      throw error;
    }
  }

  // Get items with filtering and pagination
  async getItems(filters = {}, page = 1, limit = 10) {
    try {
      const query = { status: 'available' };

      // Apply filters
      if (filters.category) query.category = filters.category;
      if (filters.condition) query.condition = filters.condition;
      if (filters.gender) query.gender = filters.gender;
      if (filters.size) query.size = filters.size;
      if (filters.minPoints) query.pointsValue = { $gte: filters.minPoints };
      if (filters.maxPoints) {
        query.pointsValue = { ...query.pointsValue, $lte: filters.maxPoints };
      }

      // Search functionality
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { brand: searchRegex },
          { tags: searchRegex }
        ];
      }

      // Calculate skip value
      const skip = (page - 1) * limit;

      // Execute query
      const items = await Item.find(query)
        .populate('userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count
      const total = await Item.countDocuments(query);

      // Generate pagination info
      const pagination = generatePagination(page, limit, total);

      return { items, pagination };
    } catch (error) {
      throw error;
    }
  }

  // Get item by ID
  async getItemById(itemId) {
    try {
      const item = await Item.findById(itemId)
        .populate('userId', 'firstName lastName username profile');

      if (!item) {
        throw new Error('Item not found');
      }

      return item;
    } catch (error) {
      throw error;
    }
  }

  // Update item
  async updateItem(itemId, userId, updateData) {
    try {
      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Check ownership
      if (item.userId.toString() !== userId) {
        throw new Error('Not authorized to update this item');
      }

      // Update item
      Object.assign(item, updateData);
      await item.save();

      return item;
    } catch (error) {
      throw error;
    }
  }

  // Delete item
  async deleteItem(itemId, userId) {
    try {
      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Check ownership
      if (item.userId.toString() !== userId) {
        throw new Error('Not authorized to delete this item');
      }

      await Item.findByIdAndDelete(itemId);

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.itemsUploaded': -1 }
      });

      return { message: 'Item deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get user's items
  async getUserItems(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const items = await Item.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Item.countDocuments({ userId });
      const pagination = generatePagination(page, limit, total);

      return { items, pagination };
    } catch (error) {
      throw error;
    }
  }

  // Approve item (admin function)
  async approveItem(itemId, adminId) {
    try {
      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Update item status
      item.status = 'available';
      await item.save();

      // Create notification for user
      await Notification.createNotification(
        item.userId,
        'item_approved',
        'Item Approved',
        `Your item "${item.title}" has been approved and is now available for swapping!`,
        { itemId: item._id }
      );

      return item;
    } catch (error) {
      throw error;
    }
  }

  // Reject item (admin function)
  async rejectItem(itemId, adminId, reason) {
    try {
      const item = await Item.findById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Update item status
      item.status = 'rejected';
      item.adminNotes = reason;
      await item.save();

      // Create notification for user
      await Notification.createNotification(
        item.userId,
        'item_rejected',
        'Item Rejected',
        `Your item "${item.title}" has been rejected. Reason: ${reason}`,
        { itemId: item._id }
      );

      return item;
    } catch (error) {
      throw error;
    }
  }

  // Get featured items
  async getFeaturedItems(limit = 8) {
    try {
      const items = await Item.find({ status: 'available' })
        .populate('userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .limit(limit);

      return items;
    } catch (error) {
      throw error;
    }
  }

  // Search items
  async searchItems(searchTerm, filters = {}, page = 1, limit = 10) {
    try {
      const query = { status: 'available' };
      const searchRegex = new RegExp(searchTerm, 'i');

      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { tags: searchRegex }
      ];

      // Apply additional filters
      if (filters.category) query.category = filters.category;
      if (filters.condition) query.condition = filters.condition;
      if (filters.gender) query.gender = filters.gender;

      const skip = (page - 1) * limit;

      const items = await Item.find(query)
        .populate('userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Item.countDocuments(query);
      const pagination = generatePagination(page, limit, total);

      return { items, pagination };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ItemService(); 