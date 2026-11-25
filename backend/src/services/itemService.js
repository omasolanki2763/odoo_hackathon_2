const Item = require('../models/Item');
const User = require('../models/User');
const { calculateItemPoints, generatePagination, escapeRegex } = require('../utils/helpers');
const { PAGINATION } = require('../utils/constants');
const Notification = require('../models/Notification');

const SORT_PRESETS = {
  newest: { createdAt: -1 },
  points_asc: { pointsValue: 1, createdAt: -1 },
  points_desc: { pointsValue: -1, createdAt: -1 }
};

const ALLOWED_LEGACY_SORT_FIELDS = new Set(['createdAt', 'pointsValue', 'title']);

const parseFilterTokens = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
};

const buildExactOrInFilter = (raw, caseInsensitive = false) => {
  const tokens = parseFilterTokens(raw);
  if (tokens.length === 0) return null;
  const normalized = caseInsensitive
    ? tokens.map((token) => new RegExp(`^${escapeRegex(token)}$`, 'i'))
    : tokens;
  return normalized.length === 1 ? normalized[0] : { $in: normalized };
};

const resolveSortSpec = (sortOptions = {}) => {
  if (typeof sortOptions === 'string' && SORT_PRESETS[sortOptions]) {
    return SORT_PRESETS[sortOptions];
  }
  if (sortOptions && typeof sortOptions === 'object') {
    if (sortOptions.sort && SORT_PRESETS[sortOptions.sort]) {
      return SORT_PRESETS[sortOptions.sort];
    }
    if (sortOptions.sortBy && ALLOWED_LEGACY_SORT_FIELDS.has(sortOptions.sortBy)) {
      const dir = sortOptions.sortOrder === 'asc' ? 1 : -1;
      return { [sortOptions.sortBy]: dir };
    }
  }
  return SORT_PRESETS.newest;
};

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
  async getItems(filters = {}, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, sortOptions = 'newest') {
    try {
      const safePage = Math.max(1, Number.isFinite(Number(page)) ? Math.floor(Number(page)) : PAGINATION.DEFAULT_PAGE);
      const safeLimit = Math.min(
        Math.max(1, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
      );

      const query = { status: 'available' };

      const categoryFilter = buildExactOrInFilter(filters.category);
      if (categoryFilter) query.category = categoryFilter;

      const conditionFilter = buildExactOrInFilter(filters.condition);
      if (conditionFilter) query.condition = conditionFilter;

      const genderFilter = buildExactOrInFilter(filters.gender);
      if (genderFilter) query.gender = genderFilter;

      const sizeFilter = buildExactOrInFilter(filters.size);
      if (sizeFilter) query.size = sizeFilter;

      const colourFilter = buildExactOrInFilter(filters.colour, true);
      if (colourFilter) query.colour = colourFilter;

      const materialFilter = buildExactOrInFilter(filters.material, true);
      if (materialFilter) query.material = materialFilter;

      if (typeof filters.brand === 'string' && filters.brand.trim()) {
        query.brand = new RegExp(escapeRegex(filters.brand.trim()), 'i');
      }

      if (Number.isFinite(filters.minPoints)) {
        query.pointsValue = { $gte: filters.minPoints };
      }
      if (Number.isFinite(filters.maxPoints)) {
        query.pointsValue = { ...(query.pointsValue || {}), $lte: filters.maxPoints };
      }

      if (typeof filters.search === 'string' && filters.search.trim()) {
        const searchRegex = new RegExp(escapeRegex(filters.search.trim()), 'i');
        query.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { brand: searchRegex },
          { material: searchRegex },
          { colour: searchRegex },
          { tags: searchRegex }
        ];
      }

      const sortSpec = resolveSortSpec(sortOptions);
      const skip = (safePage - 1) * safeLimit;

      const items = await Item.find(query)
        .populate('userId', 'firstName lastName username')
        .sort(sortSpec)
        .skip(skip)
        .limit(safeLimit);

      const total = await Item.countDocuments(query);
      const pagination = generatePagination(safePage, safeLimit, total);

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
  async searchItems(searchTerm, filters = {}, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT) {
    try {
      const safePage = Math.max(1, Number.isFinite(Number(page)) ? Math.floor(Number(page)) : PAGINATION.DEFAULT_PAGE);
      const safeLimit = Math.min(
        Math.max(1, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
      );
      const query = { status: 'available' };
      const searchRegex = new RegExp(escapeRegex(String(searchTerm).trim()), 'i');

      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { material: searchRegex },
        { colour: searchRegex },
        { tags: searchRegex }
      ];

      // Apply additional filters
      const categoryFilter = buildExactOrInFilter(filters.category);
      if (categoryFilter) query.category = categoryFilter;
      const conditionFilter = buildExactOrInFilter(filters.condition);
      if (conditionFilter) query.condition = conditionFilter;
      const genderFilter = buildExactOrInFilter(filters.gender);
      if (genderFilter) query.gender = genderFilter;

      const skip = (safePage - 1) * safeLimit;

      const items = await Item.find(query)
        .populate('userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit);

      const total = await Item.countDocuments(query);
      const pagination = generatePagination(safePage, safeLimit, total);

      return { items, pagination };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ItemService(); 