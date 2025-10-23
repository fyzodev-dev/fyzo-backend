const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema(
  {
    // Link to User account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Profile Information
    displayName: {
      type: String,
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    primaryCategory: {
      type: String,
      ref: 'Category',
      trim: true,
    },  
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    expertiseTags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Profile Media
    profilePhoto: {
      type: String,
    },
    profilePhotoPublicId: {
      type: String,
    },
    coverPhoto: {
      type: String,
    },
    coverPhotoPublicId: {
      type: String,
    },
    bannerImage: {
      type: String,
    },
    bannerImagePublicId: {
      type: String,
    },
    introVideo: {
      type: String,
    },
    introVideoPublicId: {
      type: String,
    },
    introVideoDuration: {
      type: Number, // in seconds
    },

    // Verification Status
    verificationStatus: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationRejectionReason: {
      type: String,
    },

    // ID Verification (Aadhaar)
    aadhaarFrontImage: {
      type: String,
    },
    aadhaarFrontPublicId: {
      type: String,
    },
    aadhaarBackImage: {
      type: String,
    },
    aadhaarBackPublicId: {
      type: String,
    },
    aadhaarVerified: {
      type: Boolean,
      default: false,
    },

    // Banking Details
    bankDetails: {
      accountHolderName: {
        type: String,
        trim: true,
      },
      bankName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },

    // Onboarding Progress
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 7,
    },

    // Creator Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Storefront Settings
    storeHandle: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    storeVisibility: {
      type: String,
      enum: ['public', 'hidden'],
      default: 'public',
    },

    // Profile Button Visibility
    showVideoButton: {
      type: Boolean,
      default: true,
    },
    showMessageButton: {
      type: Boolean,
      default: true,
    },

    // Analytics
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    // Timestamps
    verifiedAt: {
      type: Date,
    },
    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
creatorSchema.index({ userId: 1 });
creatorSchema.index({ storeHandle: 1 });
creatorSchema.index({ primaryCategory: 1 });
creatorSchema.index({ verificationStatus: 1 });

// Methods
creatorSchema.methods.updateOnboardingStep = function (step) {
  this.onboardingStep = Math.max(this.onboardingStep, step);
  return this.save();
};

creatorSchema.methods.completeOnboarding = function () {
  this.onboardingCompleted = true;
  this.activatedAt = new Date();
  return this.save();
};

const Creator = mongoose.model('Creator', creatorSchema);

module.exports = Creator;
