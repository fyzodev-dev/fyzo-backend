const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyOTP,
  resendOTP,
  getMe,
  logout,
  refreshToken,
  getSessions,
  logoutAll,
  cleanupSessions,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/refresh-token', refreshToken);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.get('/sessions', protect, getSessions);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

// Admin only routes
router.post('/cleanup-sessions', protect, authorize('admin'), cleanupSessions);

module.exports = router;
