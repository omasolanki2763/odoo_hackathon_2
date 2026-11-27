const mongoose = require('mongoose');
const Rating = require('../models/Rating');
const MismatchReport = require('../models/MismatchReport');
const Swap = require('../models/Swap');
const User = require('../models/User');
const AdminAction = require('../models/AdminAction');
const PointsTransaction = require('../models/PointsTransaction');
const {
  MATCH_STATUSES,
  MISMATCH_STATUSES,
  RATING_VISIBILITY_MS,
  MISMATCH_REPORT_WINDOW_MS,
  SWAP_STATUSES,
  SWAP_TYPES,
  POINTS_TRANSACTION_TYPES
} = require('../utils/constants');

const createServiceError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const normalizeMatchStatus = (raw) => {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (cleaned === 'yes' || cleaned === 'small_differences' || cleaned === 'no') {
    return cleaned;
  }
  return '';
};

const buildEmptyTrustSummary = () => ({
  averageStars: 0,
  ratingCount: 0,
  matchedCount: 0
});

/**
 * Computes whether a rating is visible publicly or to the counterparty:
 * visible once both sides have rated the swap OR 7 days have passed since creation.
 */
const isRatingRevealed = (rating, distinctRaterCount, nowMs = Date.now()) => {
  if (distinctRaterCount >= 2) return true;
  const createdMs = new Date(rating.createdAt).getTime();
  return Number.isFinite(createdMs) && nowMs - createdMs >= RATING_VISIBILITY_MS;
};

class RatingService {
  /**
   * Batch computes visible trust summaries for a list of user IDs (no N+1 queries).
   */
  async getTrustSummariesForUsers(userIds, now = new Date()) {
    const uniqueIds = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];
    const summaryMap = new Map(uniqueIds.map((id) => [id, buildEmptyTrustSummary()]));
    if (uniqueIds.length === 0 || mongoose.connection.readyState !== 1) return summaryMap;

    const objectIds = uniqueIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length === 0) return summaryMap;

    const ratingsForUsers = await Rating.find({ rateeId: { $in: objectIds } })
      .select('swapId raterId rateeId stars matchStatus createdAt')
      .lean();

    if (ratingsForUsers.length === 0) return summaryMap;

    const swapIds = [...new Set(ratingsForUsers.map((r) => String(r.swapId)))];
    const allSwapRatings = await Rating.find({ swapId: { $in: swapIds } })
      .select('swapId raterId')
      .lean();

    const ratersBySwap = new Map();
    for (const r of allSwapRatings) {
      const key = String(r.swapId);
      if (!ratersBySwap.has(key)) ratersBySwap.set(key, new Set());
      ratersBySwap.get(key).add(String(r.raterId));
    }

    const accumulators = new Map();
    const nowMs = now.getTime();
    for (const rating of ratingsForUsers) {
      const raterSet = ratersBySwap.get(String(rating.swapId));
      const distinctCount = raterSet ? raterSet.size : 1;
      if (!isRatingRevealed(rating, distinctCount, nowMs)) continue;

      const rateeKey = String(rating.rateeId);
      if (!accumulators.has(rateeKey)) {
        accumulators.set(rateeKey, { sum: 0, count: 0, matched: 0 });
      }
      const acc = accumulators.get(rateeKey);
      acc.sum += rating.stars;
      acc.count += 1;
      if (rating.matchStatus === MATCH_STATUSES.YES) {
        acc.matched += 1;
      }
    }

    for (const [id, acc] of accumulators.entries()) {
      summaryMap.set(id, {
        averageStars: Math.round((acc.sum / acc.count) * 10) / 10,
        ratingCount: acc.count,
        matchedCount: acc.matched
      });
    }

    return summaryMap;
  }

  async getUserTrustSummary(userId, now = new Date()) {
    const map = await this.getTrustSummariesForUsers([userId], now);
    return map.get(String(userId)) || buildEmptyTrustSummary();
  }

  /**
   * Returns visible public ratings received by a user, newest first,
   * containing only safe public fields (stars, matchStatus, comment, createdAt, rater.username).
   */
  async getVisibleRatingsForUser(userId, now = new Date()) {
    if (!userId || mongoose.connection.readyState !== 1) return [];

    const received = await Rating.find({ rateeId: userId })
      .populate('raterId', 'username')
      .sort({ createdAt: -1 })
      .lean();

    if (received.length === 0) return [];

    const swapIds = [...new Set(received.map((r) => String(r.swapId)))];
    const allSwapRatings = await Rating.find({ swapId: { $in: swapIds } })
      .select('swapId raterId')
      .lean();

    const ratersBySwap = new Map();
    for (const r of allSwapRatings) {
      const key = String(r.swapId);
      if (!ratersBySwap.has(key)) ratersBySwap.set(key, new Set());
      ratersBySwap.get(key).add(String(r.raterId));
    }

    const nowMs = now.getTime();
    return received
      .filter((rating) => {
        const distinctCount = ratersBySwap.get(String(rating.swapId))?.size || 1;
        return isRatingRevealed(rating, distinctCount, nowMs);
      })
      .map((rating) => ({
        _id: rating._id,
        stars: rating.stars,
        matchStatus: rating.matchStatus,
        comment: rating.comment || '',
        createdAt: rating.createdAt,
        rater: rating.raterId && rating.raterId.username
          ? { username: rating.raterId.username }
          : null
      }));
  }

  /**
   * Submits a post-completion rating for the other swap participant.
   * Opens a MismatchReport if the receiver answers "no" within 7 days of completion.
   */
  async submitRating(swapId, raterId, payload = {}) {
    const swap = await Swap.findById(swapId);
    if (!swap) {
      throw createServiceError('Swap not found', 404);
    }

    const raterStr = String(raterId);
    const requesterStr = String(swap.requesterId);
    const ownerStr = String(swap.itemOwnerId);

    if (raterStr !== requesterStr && raterStr !== ownerStr) {
      throw createServiceError('Not authorized to rate this swap', 403);
    }

    if (requesterStr === ownerStr) {
      throw createServiceError('Cannot rate yourself', 400);
    }

    if (payload.rateeId !== undefined && payload.rateeId !== null) {
      if (String(payload.rateeId) === raterStr) {
        throw createServiceError('Cannot rate yourself', 400);
      }
    }

    if (swap.status !== SWAP_STATUSES.COMPLETED) {
      throw createServiceError('Swap must be completed before submitting a rating', 400);
    }

    const stars = Number(payload.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw createServiceError('Stars must be an integer between 1 and 5', 400);
    }

    const matchStatus = normalizeMatchStatus(payload.matchStatus);
    if (!matchStatus) {
      throw createServiceError('Match status must be yes, small differences, or no', 400);
    }

    const comment = typeof payload.comment === 'string' ? payload.comment.trim() : undefined;
    if (comment && comment.length > 500) {
      throw createServiceError('Comment must be 500 characters or fewer', 400);
    }

    const existing = await Rating.findOne({ swapId: swap._id, raterId });
    if (existing) {
      throw createServiceError('You have already rated this swap', 400);
    }

    const isRequester = raterStr === requesterStr;
    const rateeId = isRequester ? swap.itemOwnerId : swap.requesterId;

    if (payload.rateeId !== undefined && payload.rateeId !== null && String(payload.rateeId) !== String(rateeId)) {
      throw createServiceError('Ratee must be the other participant of this swap', 400);
    }

    // Receiver of an item answering "no" within 7 days of completion opens a mismatch report.
    const isItemReceiver = isRequester || swap.type === SWAP_TYPES.SWAP;
    const completedAt = swap.completedAt || swap.updatedAt || swap.createdAt;
    const withinMismatchWindow = Date.now() - new Date(completedAt).getTime() <= MISMATCH_REPORT_WINDOW_MS;
    const shouldCreateMismatch = matchStatus === MATCH_STATUSES.NO && isItemReceiver && withinMismatchWindow;

    const rawReason = payload.reason !== undefined ? payload.reason : payload.mismatchReason;
    const reason = typeof rawReason === 'string' ? rawReason.trim() : '';

    if (shouldCreateMismatch) {
      if (!reason) {
        throw createServiceError('Mismatch reason is required when answering no within 7 days', 400);
      }
      if (reason.length > 1000) {
        throw createServiceError('Mismatch reason must be 1000 characters or fewer', 400);
      }
    }

    let rating;
    try {
      rating = await Rating.create({
        swapId: swap._id,
        raterId,
        rateeId,
        stars,
        matchStatus,
        comment
      });
    } catch (error) {
      if (error && error.code === 11000) {
        throw createServiceError('You have already rated this swap', 400);
      }
      throw error;
    }

    let mismatchReport = null;
    if (shouldCreateMismatch) {
      const receivedItemId = isRequester ? swap.itemId : swap.requestedItemId;
      const pointsPaid = isRequester ? (swap.pointsOffered || 0) : 0;

      try {
        mismatchReport = await MismatchReport.create({
          swapId: swap._id,
          reporterId: raterId,
          reportedUserId: rateeId,
          itemId: receivedItemId,
          ratingId: rating._id,
          reason,
          status: MISMATCH_STATUSES.OPEN,
          pointsPaid
        });
      } catch (error) {
        if (error && error.code !== 11000) {
          throw error;
        }
      }
    }

    return { rating, mismatchReport };
  }

  /**
   * Returns ratings for a swap respecting the anti-retaliation visibility rule.
   */
  async getSwapRatings(swapId, callerId, isAdmin = false) {
    const swap = await Swap.findById(swapId);
    if (!swap) {
      throw createServiceError('Swap not found', 404);
    }

    const callerStr = String(callerId);
    const isParticipant =
      callerStr === String(swap.requesterId) || callerStr === String(swap.itemOwnerId);
    if (!isParticipant && !isAdmin) {
      throw createServiceError('Not authorized to view ratings for this swap', 403);
    }

    const allRatings = await Rating.find({ swapId: swap._id })
      .populate('raterId', 'username firstName lastName')
      .populate('rateeId', 'username firstName lastName')
      .sort({ createdAt: 1 })
      .lean();

    const distinctCount = new Set(allRatings.map((r) => String(r.raterId._id || r.raterId))).size;
    const nowMs = Date.now();
    const visibleRatings = allRatings.filter((r) => isRatingRevealed(r, distinctCount, nowMs));
    const myRating = allRatings.find((r) => String(r.raterId._id || r.raterId) === callerStr) || null;
    const mismatchReport = await MismatchReport.findOne({ swapId: swap._id }).lean();

    return {
      ratings: visibleRatings,
      myRating,
      bothRated: distinctCount >= 2,
      mismatchReport
    };
  }

  async listMismatchReports({ status, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status) query.status = status;

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50);
    const skip = (safePage - 1) * safeLimit;

    const [reports, total] = await Promise.all([
      MismatchReport.find(query)
        .populate('reporterId', 'username firstName lastName')
        .populate('reportedUserId', 'username firstName lastName points')
        .populate('itemId', 'title pointsValue')
        .populate('swapId', 'type pointsOffered completedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      MismatchReport.countDocuments(query)
    ]);

    return {
      reports,
      pagination: {
        currentPage: safePage,
        totalPages: Math.ceil(total / safeLimit),
        totalItems: total,
        itemsPerPage: safeLimit
      }
    };
  }

  /**
   * Resolves an open mismatch report as 'refund' or 'dismiss'.
   * Uses atomic conditional claim so concurrent admin actions cannot double-refund,
   * and atomic conditional User points debit so giver points never go negative.
   */
  async resolveMismatchReport(reportId, adminId, { action, adminNotes = '' } = {}) {
    if (action !== 'refund' && action !== 'dismiss') {
      throw createServiceError('Action must be refund or dismiss', 400);
    }

    const claimed = await MismatchReport.findOneAndUpdate(
      { _id: reportId, status: MISMATCH_STATUSES.OPEN },
      { $set: { status: MISMATCH_STATUSES.RESOLVING } },
      { new: true }
    );

    if (!claimed) {
      const existing = await MismatchReport.findById(reportId);
      if (!existing) {
        throw createServiceError('Mismatch report not found', 404);
      }
      throw createServiceError('Mismatch report has already been resolved', 400);
    }

    const now = new Date();
    const trimmedNotes = typeof adminNotes === 'string' ? adminNotes.trim() : '';

    try {
      if (action === 'dismiss') {
        const dismissed = await MismatchReport.findByIdAndUpdate(
          reportId,
          {
            $set: {
              status: MISMATCH_STATUSES.DISMISSED,
              resolvedBy: adminId,
              resolvedAt: now,
              adminNotes: trimmedNotes
            }
          },
          { new: true }
        );

        await AdminAction.create({
          adminId,
          targetType: 'mismatch_report',
          targetId: claimed._id,
          action: 'dismiss',
          reason: trimmedNotes || 'Mismatch report dismissed by admin',
          details: { previousStatus: MISMATCH_STATUSES.OPEN, newStatus: MISMATCH_STATUSES.DISMISSED }
        });

        return dismissed;
      }

      const amountRequested = Math.max(0, Number(claimed.pointsPaid) || 0);
      let collected = 0;

      if (amountRequested > 0) {
        let debitedGiver = await User.findOneAndUpdate(
          { _id: claimed.reportedUserId, points: { $gte: amountRequested } },
          { $inc: { points: -amountRequested } },
          { new: true }
        );

        if (debitedGiver) {
          collected = amountRequested;
        } else {
          // Partial balance recovery: atomically drain remaining positive points without going negative.
          for (let attempt = 0; attempt < 5; attempt++) {
            const currentGiver = await User.findById(claimed.reportedUserId).select('points');
            const available = currentGiver
              ? Math.min(amountRequested, Math.max(0, currentGiver.points))
              : 0;
            if (available === 0) break;

            debitedGiver = await User.findOneAndUpdate(
              { _id: claimed.reportedUserId, points: { $gte: available } },
              { $inc: { points: -available } },
              { new: true }
            );
            if (debitedGiver) {
              collected = available;
              break;
            }
          }
        }

        if (collected > 0) {
          const updatedReceiver = await User.findByIdAndUpdate(
            claimed.reporterId,
            { $inc: { points: collected } },
            { new: true }
          );

          const shortfall = amountRequested - collected;

          await PointsTransaction.createTransaction(
            claimed.reportedUserId,
            POINTS_TRANSACTION_TYPES.PENALTY,
            collected,
            `Mismatch refund recovered for swap ${claimed.swapId}`,
            {
              balance: debitedGiver.points,
              relatedItemId: claimed.itemId,
              relatedSwapId: claimed.swapId,
              metadata: {
                source: 'mismatch_refund',
                reason: shortfall > 0 ? `Shortfall ${shortfall} points recorded` : 'Full refund recovered',
                adminId
              }
            }
          );

          await PointsTransaction.createTransaction(
            claimed.reporterId,
            POINTS_TRANSACTION_TYPES.REFUND,
            collected,
            `Mismatch refund received for swap ${claimed.swapId}`,
            {
              balance: updatedReceiver.points,
              relatedItemId: claimed.itemId,
              relatedSwapId: claimed.swapId,
              metadata: {
                source: 'mismatch_refund',
                reason: shortfall > 0 ? `Partial refund (${shortfall} shortfall)` : 'Full refund received',
                adminId
              }
            }
          );
        }
      }

      const shortfall = amountRequested - collected;
      const refunded = await MismatchReport.findByIdAndUpdate(
        reportId,
        {
          $set: {
            status: MISMATCH_STATUSES.REFUNDED,
            refundApplied: collected,
            shortfall,
            resolvedBy: adminId,
            resolvedAt: now,
            adminNotes: trimmedNotes
          }
        },
        { new: true }
      );

      await AdminAction.create({
        adminId,
        targetType: 'mismatch_report',
        targetId: claimed._id,
        action: 'refund',
        reason: trimmedNotes || `Mismatch refund resolved (${collected} returned, ${shortfall} shortfall)`,
        details: { previousStatus: MISMATCH_STATUSES.OPEN, newStatus: MISMATCH_STATUSES.REFUNDED }
      });

      return refunded;
    } catch (error) {
      // Restore open status if an unexpected failure occurs before resolution finalizes
      await MismatchReport.findOneAndUpdate(
        { _id: reportId, status: MISMATCH_STATUSES.RESOLVING },
        { $set: { status: MISMATCH_STATUSES.OPEN } }
      ).catch(() => {});
      throw error;
    }
  }
}

module.exports = new RatingService();
