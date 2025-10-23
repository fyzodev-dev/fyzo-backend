const User = require('../models/User');
const Session = require('../models/Session');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendWelcomeEmail, sendOTPEmail } = require('../utils/emailService');

// Generate Refresh Token (7 days expiry - single token system)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // 7 days - single token authentication
  });
};

// Extract device info from request
const getDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const deviceType = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'web';
  
  return {
    deviceType,
    deviceName: userAgent.substring(0, 100),
    os: extractOS(userAgent),
    browser: extractBrowser(userAgent),
    ipAddress: req.ip || req.connection.remoteAddress,
  };
};

const extractOS = (userAgent) => {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac/i.test(userAgent)) return 'MacOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
  return 'Unknown';
};

const extractBrowser = (userAgent) => {
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/edge/i.test(userAgent)) return 'Edge';
  return 'Unknown';
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    // Validation
    if (!name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and mobile number',
      });
    }

    // Normalize email for consistency
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔵 Registration request:', { name, originalEmail: email, normalizedEmail, mobile });

    // Check if user already exists with normalized email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log('🔴 User already exists with email:', normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user with normalized email
    const user = await User.create({
      name,
      email: normalizedEmail,
      mobile,
    });

    console.log('🟢 User registered successfully:', { id: user._id, email: user.email });

    // Send welcome email (async - don't wait)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Error sending welcome email:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please login to continue.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        },
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during registration',
    });
  }
};

// @desc    Login user (Send OTP)
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email',
      });
    }

    // Normalize email to match verification endpoint
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔵 Login request:', { originalEmail: email, normalizedEmail });

    // Find user with normalized email
    let user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.log('🔴 User not found with email:', normalizedEmail);
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please sign up first.',
      });
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    console.log('🟢 OTP Generated:', { 
      email: user.email, 
      otp, 
      expiresAt: user.otp.expiresAt,
      validFor: '10 minutes'
    });

    // Send OTP via email
    await sendOTPEmail(user.email, otp);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${user.email}`,
      data: {
        email: user.email,
        expiresIn: '10 minutes',
        // Include OTP in development mode for testing
        ...(process.env.NODE_ENV === 'development' && { otp }),
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending OTP',
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔵 OTP Verification attempt:', { 
      email, 
      otp, 
      otpType: typeof otp,
      otpLength: otp ? otp.toString().length : 0 
    });

    // Validation
    if (!email || !otp) {
      console.log('🔴 Missing email or OTP');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log('🔴 User not found:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('🔵 User found. OTP data:', { 
      storedOTP: user.otp?.code, 
      storedOTPType: typeof user.otp?.code,
      inputOTP: otp,
      inputOTPType: typeof otp,
      otpExpiry: user.otp?.expiresAt,
      isExpired: user.otp?.expiresAt ? Date.now() > user.otp.expiresAt : null,
      attempts: user.otp?.attempts,
      timeRemaining: user.otp?.expiresAt ? Math.floor((user.otp.expiresAt - Date.now()) / 1000) : null
    });

    // Verify OTP - ensure both are strings and trimmed
    const trimmedOTP = otp.toString().trim();
    console.log('🔵 Verifying OTP:', { trimmedOTP, length: trimmedOTP.length });
    
    const result = user.verifyOTP(trimmedOTP);
    
    if (!result.success) {
      console.log('🔴 OTP Verification failed:', result.message);
      await user.save(); // Save attempt count
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    console.log('🟢 OTP Verification successful for:', user.email);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    console.log('✅ User saved with lastLogin updated');

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured in .env file!');
      throw new Error('Server configuration error. Please contact support.');
    }

    // Generate refresh token (7 days)
    console.log('🔑 Generating refresh token...');
    const refreshToken = generateRefreshToken(user._id);
    console.log('✅ Refresh token generated');

    // Calculate expiry (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create session in database
    console.log('💾 Creating session in database...');
    const session = await Session.create({
      user: user._id,
      refreshToken: refreshToken,
      deviceInfo: getDeviceInfo(req),
      expiresAt: expiresAt,
    });
    console.log('✅ Session created:', { sessionId: session._id });

    console.log('📤 Sending success response to client');
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        refreshToken: refreshToken,
        expiresIn: '7d',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          profileImage: user.profileImage,
          bio: user.bio,
          location: user.location,
          website: user.website,
          interests: user.interests,
        },
      },
    });
  } catch (error) {
    console.error('❌ Verify OTP Error - FULL DETAILS:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying OTP',
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email',
      });
    }

    // Normalize email to match other endpoints
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔵 Resend OTP request:', { originalEmail: email, normalizedEmail });

    // Find user with normalized email
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.log('🔴 User not found with email:', normalizedEmail);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    console.log('🟢 New OTP Generated:', { 
      email: user.email, 
      otp, 
      expiresAt: user.otp.expiresAt,
      validFor: '10 minutes'
    });

    // Send OTP via email
    await sendOTPEmail(user.email, otp);

    res.status(200).json({
      success: true,
      message: `New OTP sent to ${user.email}`,
      data: {
        email: user.email,
        expiresIn: '10 minutes',
        // Include OTP in development mode for testing
        ...(process.env.NODE_ENV === 'development' && { otp }),
      },
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resending OTP',
      });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private (requires authentication)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-otp');

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user data',
    });
  }
};

// @desc    Refresh token - DEPRECATED (no longer needed with 7-day tokens)
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Token refresh is no longer supported. Please login again if your session has expired.',
  });
};

// @desc    Get all active sessions
// @route   GET /api/v1/auth/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      user: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select('deviceInfo lastActivity createdAt')
      .sort({ lastActivity: -1 });

    res.status(200).json({
      success: true,
      data: { sessions, count: sessions.length },
    });
  } catch (error) {
    console.error('Get Sessions Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching sessions',
    });
  }
};

// @desc    Logout user (deactivate current session)
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Get refresh token from header
    const refreshToken = req.headers.authorization?.split(' ')[1];

    console.log('🔴 Logout request received');

    if (refreshToken) {
      // Find and deactivate session
      const session = await Session.findOne({ refreshToken, isActive: true });
      if (session) {
        await session.deactivate();
        console.log('✅ Session deactivated:', { sessionId: session._id });
      } else {
        console.log('⚠️ No active session found for this token');
      }
    } else {
      console.log('⚠️ No refresh token provided in request');
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Logout Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during logout',
    });
  }
};

// @desc    Logout from all devices
// @route   POST /api/v1/auth/logout-all
// @access  Private
exports.logoutAll = async (req, res) => {
  try {
    // Deactivate all user sessions
    const count = await Session.deactivateUserSessions(req.user._id);

    res.status(200).json({
      success: true,
      message: `Logged out from ${count} device(s) successfully`,
      data: { sessionsDeactivated: count },
    });
  } catch (error) {
    console.error('Logout All Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during logout',
    });
  }
};

// @desc    Cleanup expired sessions (for cron job)
// @route   POST /api/v1/auth/cleanup-sessions
// @access  Private (Admin only)
exports.cleanupSessions = async (req, res) => {
  try {
    const count = await Session.cleanupInactiveSessions();

    res.status(200).json({
      success: true,
      message: `Cleaned up ${count} expired session(s)`,
      data: { sessionsRemoved: count },
    });
  } catch (error) {
    console.error('Cleanup Sessions Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error cleaning up sessions',
    });
  }
};
