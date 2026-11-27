const User = require('../models/User');
const PointsTransaction = require('../models/PointsTransaction');
const Swap = require('../models/Swap');
const { generatePagination } = require('../utils/helpers');
const { PAGINATION, POINTS_TRANSACTION_TYPES, SWAP_STATUSES } = require('../utils/constants');

// Ledger types that add to a balance (earned) and that take from it (spent).
// Holds are neither: they are reported separately as heldNow while pending.
const CREDIT_TYPES = [
  POINTS_TRANSACTION_TYPES.EARNED,
  POINTS_TRANSACTION_TYPES.RECEIVED,
  POINTS_TRANSACTION_TYPES.BONUS,
  POINTS_TRANSACTION_TYPES.REFUND
];
const DEBIT_TYPES = [
  POINTS_TRANSACTION_TYPES.SPENT,
  POINTS_TRANSACTION_TYPES.SENT,
  POINTS_TRANSACTION_TYPES.PENALTY
];

/**
 * Adds up the amounts of the ledger rows whose type is in `types`.
 * @param {{type: string, amount: number}[]} rows ledger rows
 * @param {string[]} types the transaction types to include
 * @returns {number} the total amount
 */
const sumByType = (rows, types) =>
  rows
    .filter((row) => types.includes(row.type))
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

class PointsService {
  // Add points to user
  async addPoints(userId, amount, description, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user points
      const newBalance = user.points + amount;
      await User.findByIdAndUpdate(userId, { points: newBalance });

      // Create transaction record
      const transaction = await PointsTransaction.createTransaction(
        userId,
        'earned',
        amount,
        description,
        {
          balance: newBalance,
          relatedItemId: options.relatedItemId,
          relatedSwapId: options.relatedSwapId,
          metadata: options.metadata
        }
      );

      return { user, transaction };
    } catch (error) {
      throw error;
    }
  }

  // Deduct points from user
  async deductPoints(userId, amount, description, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has enough points
      if (user.points < amount) {
        throw new Error('Insufficient points');
      }

      // Update user points
      const newBalance = user.points - amount;
      await User.findByIdAndUpdate(userId, { points: newBalance });

      // Create transaction record
      const transaction = await PointsTransaction.createTransaction(
        userId,
        'spent',
        amount,
        description,
        {
          balance: newBalance,
          relatedItemId: options.relatedItemId,
          relatedSwapId: options.relatedSwapId,
          metadata: options.metadata
        }
      );

      return { user, transaction };
    } catch (error) {
      throw error;
    }
  }

  // Transfer points between users
  async transferPoints(fromUserId, toUserId, amount, description, options = {}) {
    try {
      const fromUser = await User.findById(fromUserId);
      const toUser = await User.findById(toUserId);

      if (!fromUser || !toUser) {
        throw new Error('User not found');
      }

      // Check if sender has enough points
      if (fromUser.points < amount) {
        throw new Error('Insufficient points');
      }

      // Update both users' points
      const fromUserNewBalance = fromUser.points - amount;
      const toUserNewBalance = toUser.points + amount;

      await User.findByIdAndUpdate(fromUserId, { points: fromUserNewBalance });
      await User.findByIdAndUpdate(toUserId, { points: toUserNewBalance });

      // Create transaction records
      const fromTransaction = await PointsTransaction.createTransaction(
        fromUserId,
        'sent',
        amount,
        `Sent: ${description}`,
        {
          balance: fromUserNewBalance,
          relatedItemId: options.relatedItemId,
          relatedSwapId: options.relatedSwapId,
          metadata: options.metadata
        }
      );

      const toTransaction = await PointsTransaction.createTransaction(
        toUserId,
        'received',
        amount,
        `Received: ${description}`,
        {
          balance: toUserNewBalance,
          relatedItemId: options.relatedItemId,
          relatedSwapId: options.relatedSwapId,
          metadata: options.metadata
        }
      );

      return { fromTransaction, toTransaction };
    } catch (error) {
      throw error;
    }
  }

  // Get user's points history
  async getPointsHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const transactions = await PointsTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await PointsTransaction.countDocuments({ userId });
      const pagination = generatePagination(page, limit, total);

      return { transactions, pagination };
    } catch (error) {
      throw error;
    }
  }

  /**
   * The signed-in member's own points ledger for the points history page.
   *
   * Entries are newest first and paginated; totals are lifetime figures that do
   * not change with the type filter, so the summary stays stable while the
   * member narrows the list.
   *
   * @param {string} userId the member whose ledger is read (always the caller)
   * @param {object} options page, limit (clamped to PAGINATION.MAX_LIMIT) and
   *   types (array of transaction types to list; empty means all)
   * @returns {Promise<{entries: object[], totals: object, pagination: object}>}
   */
  async getMyHistory(userId, { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, types = [] } = {}) {
    const safePage = Math.max(1, Math.floor(Number(page)) || PAGINATION.DEFAULT_PAGE);
    const safeLimit = Math.min(
      Math.max(1, Math.floor(Number(limit)) || PAGINATION.DEFAULT_LIMIT),
      PAGINATION.MAX_LIMIT
    );

    const listQuery = { userId };
    if (types.length > 0) {
      listQuery.type = { $in: types };
    }

    const [rows, total, user, lifetimeRows, pendingHolds] = await Promise.all([
      PointsTransaction.find(listQuery)
        // _id breaks ties so rows written in the same millisecond keep a stable order.
        .sort({ createdAt: -1, _id: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('relatedItemId', 'title')
        .populate('relatedSwapId', 'status type')
        .lean(),
      PointsTransaction.countDocuments(listQuery),
      User.findById(userId).select('points').lean(),
      PointsTransaction.find({ userId }).select('type amount').lean(),
      // Points are "held" only while the request that holds them is still pending.
      Swap.find({ requesterId: userId, status: SWAP_STATUSES.PENDING }).select('pointsOffered').lean()
    ]);

    const totals = {
      balance: user ? user.points : 0,
      earned: sumByType(lifetimeRows, CREDIT_TYPES),
      spent: sumByType(lifetimeRows, DEBIT_TYPES),
      heldNow: pendingHolds.reduce((sum, swap) => sum + (Number(swap.pointsOffered) || 0), 0)
    };

    const entries = rows.map((row) => ({
      id: String(row._id),
      type: row.type,
      amount: row.amount,
      balance: row.balance,
      description: row.description,
      createdAt: row.createdAt,
      relatedItem: row.relatedItemId
        ? { id: String(row.relatedItemId._id), title: row.relatedItemId.title }
        : null,
      relatedSwap: row.relatedSwapId
        ? { id: String(row.relatedSwapId._id), status: row.relatedSwapId.status, type: row.relatedSwapId.type }
        : null
    }));

    return {
      entries,
      totals,
      pagination: generatePagination(safePage, safeLimit, total)
    };
  }

  // Get user's current points balance
  async getPointsBalance(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        points: user.points,
        userId: user._id
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate points for item upload
  async calculateUploadPoints(itemData) {
    try {
      const { condition, category } = itemData;
      
      // Base points calculation
      let basePoints = 0;
      
      switch (category) {
        case 'tops':
          basePoints = 50;
          break;
        case 'bottoms':
          basePoints = 60;
          break;
        case 'dresses':
          basePoints = 80;
          break;
        case 'outerwear':
          basePoints = 100;
          break;
        case 'shoes':
          basePoints = 70;
          break;
        case 'accessories':
          basePoints = 30;
          break;
        default:
          basePoints = 50;
      }

      // Apply condition multiplier
      let conditionMultiplier = 1;
      switch (condition) {
        case 'new':
          conditionMultiplier = 1.0;
          break;
        case 'like-new':
          conditionMultiplier = 0.9;
          break;
        case 'good':
          conditionMultiplier = 0.7;
          break;
        case 'fair':
          conditionMultiplier = 0.5;
          break;
        case 'worn':
          conditionMultiplier = 0.3;
          break;
        default:
          conditionMultiplier = 0.5;
      }

      return Math.round(basePoints * conditionMultiplier);
    } catch (error) {
      throw error;
    }
  }

  // Award bonus points
  async awardBonusPoints(userId, amount, reason, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user points
      const newBalance = user.points + amount;
      await User.findByIdAndUpdate(userId, { points: newBalance });

      // Create transaction record
      const transaction = await PointsTransaction.createTransaction(
        userId,
        'bonus',
        amount,
        `Bonus: ${reason}`,
        {
          balance: newBalance,
          relatedItemId: options.relatedItemId,
          relatedSwapId: options.relatedSwapId,
          metadata: {
            source: 'bonus',
            reason: reason,
            adminId: options.adminId
          }
        }
      );

      return { user, transaction };
    } catch (error) {
      throw error;
    }
  }

  // Apply penalty points
  async applyPenalty(userId, amount, reason, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has enough points
      if (user.points < amount) {
        // Set points to 0 if penalty exceeds balance
        amount = user.points;
      }

      // Update user points
      const newBalance = Math.max(0, user.points - amount);
      await User.findByIdAndUpdate(userId, { points: newBalance });

      // Create transaction record
      const transaction = await PointsTransaction.createTransaction(
        userId,
        'penalty',
        amount,
        `Penalty: ${reason}`,
        {
          balance: newBalance,
          relatedItemId: options.relatedItemId,
          relatedSwapId: options.relatedSwapId,
          metadata: {
            source: 'penalty',
            reason: reason,
            adminId: options.adminId
          }
        }
      );

      return { user, transaction };
    } catch (error) {
      throw error;
    }
  }

  // Get points statistics
  async getPointsStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get transaction statistics
      const stats = await PointsTransaction.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat._id] = {
          total: stat.total,
          count: stat.count
        };
      });

      return {
        currentBalance: user.points,
        stats: statsMap
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PointsService(); 