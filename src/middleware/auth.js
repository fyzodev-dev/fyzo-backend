const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// Protect routes - verify refresh token (single token system)
exports.protect = async (req, res, next) => {
  try {
    let refreshToken;

    // Check for refresh token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      refreshToken = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }

    // Make sure token exists
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.',
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      // Check if session exists in database and is active
      const session = await Session.findOne({
        refreshToken: refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session not found or expired. Please login again.',
        });
      }

      // Get user from token
      req.user = await User.findById(decoded.id).select('-otp');

      if (!req.user) {
        // Deactivate session if user not found
        await session.deactivate();
        return res.status(401).json({
          success: false,
          message: 'User not found. Please login again.',
        });
      }

      if (!req.user.isActive) {
        // Deactivate all user sessions
        await Session.deactivateUserSessions(req.user._id);
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.',
        });
      }

      // Update session activity (async, don't wait)
      session.updateActivity().catch(err => 
        console.error('Error updating session activity:', err)
      );

      req.session = session; // Attach session to request
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
