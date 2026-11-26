const swapService = require('../services/swapService');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');

class SwapController {
  // Get swap or redeem quote
  async getQuote(req, res) {
    try {
      const requesterId = req.user._id;
      const { item: itemId, offer: offerId, topUp } = req.query;

      const quote = await swapService.getQuote(requesterId, {
        itemId,
        offerId,
        topUp
      });

      return successResponse(res, quote);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Get user's swaps
  async getUserSwaps(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status, type, direction } = req.query;

      const filters = { status, type, direction };
      const result = await swapService.getUserSwaps(userId, filters, parseInt(page, 10), parseInt(limit, 10));

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Get swap by ID
  async getSwapById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const swap = await swapService.getSwapById(id, userId);

      return successResponse(res, swap);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  // Create swap request
  async createSwap(req, res) {
    try {
      const requesterId = req.user._id;
      const swapData = req.body;

      const swap = await swapService.createSwap(requesterId, swapData);

      return createdResponse(res, swap, 'Swap request created successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Redeem item with points
  async redeemItem(req, res) {
    try {
      const requesterId = req.user._id;
      const redeemData = { ...req.body, type: 'redeem' };

      const swap = await swapService.createSwap(requesterId, redeemData);

      return createdResponse(res, swap, 'Item redemption request created successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Direct redemption - immediate purchase
  async directRedeem(req, res) {
    try {
      const requesterId = req.user._id;
      const { itemId, pointsOffered } = req.body;

      const result = await swapService.directRedeem(requesterId, itemId, pointsOffered);

      return successResponse(res, result, 'Item redeemed successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Accept swap request
  async acceptSwap(req, res) {
    try {
      const { id } = req.params;
      const itemOwnerId = req.user._id;

      const swap = await swapService.acceptSwap(id, itemOwnerId);

      return successResponse(res, swap, 'Swap accepted successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Reject swap request
  async rejectSwap(req, res) {
    try {
      const { id } = req.params;
      const itemOwnerId = req.user._id;
      const { reason } = req.body;

      const swap = await swapService.rejectSwap(id, itemOwnerId, reason);

      return successResponse(res, swap, 'Swap rejected successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Complete swap
  async completeSwap(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const swap = await swapService.completeSwap(id, userId);

      return successResponse(res, swap, 'Swap completed successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // Cancel swap
  async cancelSwap(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const swap = await swapService.cancelSwap(id, userId);

      return successResponse(res, swap, 'Swap cancelled successfully');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new SwapController();
