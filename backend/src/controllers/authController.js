const authService = require('../services/authService');
const { MESSAGES } = require('../utils/constants');
const { successResponse, errorResponse, createdResponse, unauthorizedResponse } = require('../utils/response');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      const result = await authService.register({
        username,
        email,
        password
      });

      return createdResponse(res, result, 'User registered successfully');
    } catch (error) {
      const statusCode = error.statusCode
        || (error.code === 11000 || error.name === 'ValidationError' ? 400 : 500);
      const message = statusCode >= 500 ? MESSAGES.SERVER_ERROR : error.message;
      return errorResponse(res, message, statusCode);
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      return successResponse(res, result, 'Login successful');
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode === 401) {
        return unauthorizedResponse(res, error.message);
      }
      const message = statusCode >= 500 ? MESSAGES.SERVER_ERROR : error.message;
      return errorResponse(res, message, statusCode);
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user._id;
      const profile = await authService.getProfile(userId);

      return successResponse(res, profile);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      const updatedProfile = await authService.updateProfile(userId, updateData);

      return successResponse(res, updatedProfile, 'Profile updated successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Get user dashboard
  async getDashboard(req, res) {
    try {
      const userId = req.user._id;
      const dashboard = await authService.getDashboard(userId);

      return successResponse(res, dashboard);
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Verify token
  async verifyToken(req, res) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return unauthorizedResponse(res, 'No token provided');
      }

      const user = await authService.verifyToken(token);
      return successResponse(res, { user });
    } catch (error) {
      return unauthorizedResponse(res, error.message);
    }
  }
}

module.exports = new AuthController(); 