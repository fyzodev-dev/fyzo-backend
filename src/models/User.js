const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    mobile: {
      type: String,
      required: [true, 'Please provide your mobile number'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit mobile number'],
    },
    role: {
      type: String,
      enum: ['user', 'creator', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: '',
    },
    website: {
      type: String,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
      default: '',
    },
    interests: {
      type: [String],
      default: [],
    },
    notificationPreferences: {
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      emailUpdates: {
        type: Boolean,
        default: true,
      },
      courseReminders: {
        type: Boolean,
        default: true,
      },
      promoOffers: {
        type: Boolean,
        default: false,
      },
    },
    otp: {
      code: String,
      expiresAt: Date,
      attempts: {
        type: Number,
        default: 0,
      },
    },
    lastLogin: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes are defined in schema above (email: unique + index, mobile: index below)
userSchema.index({ mobile: 1 });

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
  this.otp = {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function (inputOTP) {
  console.log('🔍 verifyOTP called with:', { inputOTP, hasOTP: !!this.otp });

  if (!this.otp || !this.otp.code) {
    console.log('🔴 No OTP found');
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }

  if (this.otp.attempts >= 5) {
    console.log('🔴 Too many attempts:', this.otp.attempts);
    return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  if (Date.now() > this.otp.expiresAt) {
    console.log('🔴 OTP expired:', { 
      now: Date.now(), 
      expiresAt: this.otp.expiresAt,
      diff: Date.now() - this.otp.expiresAt 
    });
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  this.otp.attempts += 1;

  // Ensure both OTPs are strings and trimmed for comparison
  const storedOTP = String(this.otp.code).trim();
  const providedOTP = String(inputOTP).trim();

  console.log('🔍 OTP comparison:', { 
    storedOTP, 
    storedLength: storedOTP.length,
    providedOTP, 
    providedLength: providedOTP.length,
    match: storedOTP === providedOTP,
    attempt: this.otp.attempts
  });

  if (storedOTP !== providedOTP) {
    console.log('🔴 OTP mismatch');
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP is valid
  console.log('🟢 OTP match! Clearing OTP and marking email as verified');
  this.isEmailVerified = true;
  this.otp = undefined; // Clear OTP after successful verification
  return { success: true, message: 'OTP verified successfully.' };
};

// Clear OTP
userSchema.methods.clearOTP = function () {
  this.otp = undefined;
};

// Remove sensitive data from JSON response
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.otp;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
