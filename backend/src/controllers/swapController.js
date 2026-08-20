const swapService = require('../services/swapService');
const { successResponse, errorResponse, notFoundResponse, createdResponse } = require('../utils/response');

class SwapController {
  // Get user's swaps
  async getUserSwaps(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status, type } = req.query;

      const filters = { status, type };
      const result = await swapService.getUserSwaps(userId, filters, parseInt(page), parseInt(limit));

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
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
      return notFoundResponse(res, error.message);
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
      return errorResponse(res, error.message);
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
      return errorResponse(res, error.message);
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
      return errorResponse(res, error.message);
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
      return errorResponse(res, error.message);
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
      return errorResponse(res, error.message);
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
      return errorResponse(res, error.message);
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
      return errorResponse(res, error.message);
    }
  }
}

module.exports = new SwapController(); 