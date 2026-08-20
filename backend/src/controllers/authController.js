const authService = require('../services/authService');
const { successResponse, errorResponse, createdResponse, unauthorizedResponse } = require('../utils/response');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      console.log('Registration request body:', req.body); // Debug log
      const { username, email, password } = req.body;

      const result = await authService.register({
        username,
        email,
        password
      });

      console.log('Registration successful:', result); // Debug log
      return createdResponse(res, result, 'User registered successfully');
    } catch (error) {
      console.error('Registration error:', error); // Debug log
      return errorResponse(res, error.message);
    }
  }

  // Login user
  async login(req, res) {
    try {
      console.log('🔐 Login attempt for email:', req.body.email); // Debug log
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      console.log('✅ Login successful for:', email); // Debug log
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      console.log('❌ Login failed for:', req.body.email, 'Error:', error.message); // Debug log
      return unauthorizedResponse(res, error.message);
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