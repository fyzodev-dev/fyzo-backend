const Creator = require('../models/Creator');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    console.log('📤 Cloudinary upload config:', {
      folder,
      resourceType,
      bufferSize: buffer.length,
    });

    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
    };

    // Add transformations for images only
    if (resourceType === 'image' || (resourceType === 'auto' && folder.includes('profile'))) {
      uploadOptions.transformation = [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
      ];
    } else if (resourceType === 'video') {
      // Video-specific settings
      uploadOptions.quality = 'auto:good';
      uploadOptions.format = 'mp4'; // Convert to MP4 for compatibility
    } else {
      uploadOptions.transformation = [{ quality: 'auto:good' }];
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload result:', result.secure_url);
          resolve(result);
        }
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    console.log('🗑️ Deleting from Cloudinary:', { publicId, resourceType });
    
    // Determine resource type if not specified
    if (publicId.includes('intro-video')) {
      resourceType = 'video';
    }
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    
    console.log('✅ Cloudinary deletion result:', result);
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
  }
};

// @desc    Initialize creator profile (Step 1: After account creation)
// @route   POST /api/v1/creator/onboarding/initialize
// @access  Private
exports.initializeCreatorProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if creator profile already exists
    let creator = await Creator.findOne({ userId });

    if (creator) {
      return res.status(200).json({
        success: true,
        message: 'Creator profile already exists',
        data: creator,
      });
    }

    // Create new creator profile
    creator = await Creator.create({
      userId,
      onboardingStep: 1,
    });

    res.status(201).json({
      success: true,
      message: 'Creator profile initialized successfully',
      data: creator,
    });
  } catch (error) {
    console.error('Initialize creator profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing creator profile',
      error: error.message,
    });
  }
};

// @desc    Update profile details (Step 2: Category & Bio)
// @route   PUT /api/v1/creator/onboarding/profile
// @access  Private
exports.updateCreatorProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { primaryCategory, bio } = req.body;

    // Validation
    if (!primaryCategory) {
      return res.status(400).json({
        success: false,
        message: 'Primary category is required',
      });
    }

    const validCategories = [
      // Health & Wellness
      'fitness',
      'yoga',
      'nutrition',
      'mental-health',
      'wellness',
      // Business & Finance
      'business',
      'finance',
      'accounting',
      'real-estate',
      'sales',
      // Creative Arts
      'photography',
      'design',
      'music',
      'writing',
      'art',
      // Technology & Development
      'programming',
      'web-development',
      'mobile-dev',
      'data-science',
      'cybersecurity',
      // Marketing & Media
      'marketing',
      'social-media',
      'seo',
      'advertising',
      'public-relations',
      // Education & Teaching
      'education',
      'language',
      'test-prep',
      'tutoring',
      // Lifestyle & Personal Development
      'lifestyle',
      'cooking',
      'personal-development',
      'productivity',
      'career-coaching',
      // Other Professional
      'legal',
      'consulting',
      'project-management',
      'hr',
      'other',
    ];

    if (!validCategories.includes(primaryCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected',
      });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Bio cannot exceed 500 characters',
      });
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      // Initialize if not exists
      creator = await Creator.create({
        userId,
        primaryCategory,
        bio: bio || '',
        onboardingStep: 2,
      });
    } else {
      creator.primaryCategory = primaryCategory;
      if (bio !== undefined) creator.bio = bio;
      await creator.updateOnboardingStep(2);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: creator,
    });
  } catch (error) {
    console.error('Update creator profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// @desc    Update setup details (Step 3: Display name, tagline, tags, photo)
// @route   PUT /api/v1/creator/onboarding/setup
// @access  Private
exports.updateCreatorSetup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, tagline, expertiseTags, showVideoButton, showMessageButton } = req.body;

    // Validation
    if (displayName && displayName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Display name cannot exceed 100 characters',
      });
    }

    if (tagline && tagline.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Tagline cannot exceed 30 characters',
      });
    }

    if (expertiseTags && expertiseTags.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 expertise tags allowed',
      });
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found. Please complete previous steps.',
      });
    }

    if (displayName) creator.displayName = displayName;
    if (tagline !== undefined) creator.tagline = tagline;
    if (expertiseTags) creator.expertiseTags = expertiseTags;
    if (showVideoButton !== undefined) creator.showVideoButton = showVideoButton;
    if (showMessageButton !== undefined) creator.showMessageButton = showMessageButton;

    await creator.updateOnboardingStep(3);

    // **IMPORTANT**: Assign creator role after completing the 3 basic onboarding screens
    // This makes the user a creator (unverified) and enables the User/Creator toggle
    await User.findByIdAndUpdate(userId, { role: 'creator' });

    res.status(200).json({
      success: true,
      message: 'Setup details updated successfully',
      data: creator,
    });
  } catch (error) {
    console.error('Update creator setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setup details',
      error: error.message,
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/v1/creator/onboarding/upload-profile-photo
// @access  Private
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('📸 Creator upload profile photo request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers['content-type']);

    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Delete old profile photo if exists
    if (creator.profilePhotoPublicId) {
      await deleteFromCloudinary(creator.profilePhotoPublicId);
    }

    // Upload new photo to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'fyzo/creator-profiles');

    creator.profilePhoto = result.secure_url;
    creator.profilePhotoPublicId = result.public_id;

    await creator.save();

    // Also update user profile image for consistency
    await User.findByIdAndUpdate(userId, {
      profileImage: result.secure_url,
      cloudinaryPublicId: result.public_id,
    });

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: creator.profilePhoto,
        profilePhotoPublicId: creator.profilePhotoPublicId,
      },
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile photo',
      error: error.message,
    });
  }
};

// @desc    Upload banner image
// @route   POST /api/v1/creator/onboarding/upload-banner-image
// @access  Private
exports.uploadBannerImage = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('🖼️ Creator upload banner image request received');
    console.log('File:', req.file);

    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Delete old banner image if exists
    if (creator.bannerImagePublicId) {
      await deleteFromCloudinary(creator.bannerImagePublicId);
    }

    // Upload new banner to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'fyzo/creator-banners', 'image');

    creator.bannerImage = result.secure_url;
    creator.bannerImagePublicId = result.public_id;

    await creator.save();

    res.status(200).json({
      success: true,
      message: 'Banner image uploaded successfully',
      data: {
        bannerImage: creator.bannerImage,
        bannerImagePublicId: creator.bannerImagePublicId,
      },
    });
  } catch (error) {
    console.error('Upload banner image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading banner image',
      error: error.message,
    });
  }
};

// @desc    Upload intro video (URL only)
// @route   POST /api/v1/creator/onboarding/upload-intro-video
// @access  Private
exports.uploadIntroVideo = async (req, res) => {
  try {
    console.log('🎬 Upload intro video URL request received');
    const userId = req.user._id;
    const { videoUrl, duration } = req.body;
    
    console.log('Request data:', { userId, videoUrl, duration });

    // Validate inputs
    if (!videoUrl || !videoUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid video URL',
      });
    }

    if (!duration || duration <= 0 || duration > 90) {
      return res.status(400).json({
        success: false,
        message: 'Video duration must be between 1 and 90 seconds',
      });
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Delete old video from Cloudinary if it exists
    if (creator.introVideoPublicId) {
      console.log('🗑️ Deleting old video from Cloudinary:', creator.introVideoPublicId);
      await deleteFromCloudinary(creator.introVideoPublicId);
    }

    // Save video URL
    creator.introVideo = videoUrl.trim();
    creator.introVideoPublicId = null; // URL-based videos don't have Cloudinary ID
    creator.introVideoDuration = duration;

    await creator.save();
    console.log('✅ Video URL saved successfully');

    return res.status(200).json({
      success: true,
      message: 'Intro video URL saved successfully',
      data: {
        introVideo: creator.introVideo,
        introVideoPublicId: creator.introVideoPublicId,
        introVideoDuration: creator.introVideoDuration,
      },
    });
  } catch (error) {
    console.error('Upload intro video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving intro video URL',
      error: error.message,
    });
  }
};

// @desc    Delete intro video
// @route   DELETE /api/v1/creator/onboarding/delete-intro-video
// @access  Private
exports.deleteIntroVideo = async (req, res) => {
  try {
    console.log('🗑️ Delete intro video request received');
    const userId = req.user._id;
    console.log('User ID:', userId);

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      console.log('❌ Creator profile not found');
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    console.log('Creator found:', {
      hasIntroVideo: !!creator.introVideo,
      introVideoPublicId: creator.introVideoPublicId,
      introVideoDuration: creator.introVideoDuration,
    });

    // Delete from Cloudinary if exists
    if (creator.introVideoPublicId) {
      console.log('🗑️ Deleting from Cloudinary:', creator.introVideoPublicId);
      await deleteFromCloudinary(creator.introVideoPublicId);
      console.log('✅ Deleted from Cloudinary');
    } else {
      console.log('ℹ️ No Cloudinary public ID found, skipping cloud deletion');
    }

    creator.introVideo = null;
    creator.introVideoPublicId = null;
    creator.introVideoDuration = null;

    await creator.save();
    console.log('✅ Creator profile updated - video fields cleared');

    res.status(200).json({
      success: true,
      message: 'Intro video deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete intro video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting intro video',
      error: error.message,
    });
  }
};

// @desc    Upload ID verification documents (Step 4: Aadhaar)
// @route   POST /api/v1/creator/onboarding/upload-aadhaar
// @access  Private
exports.uploadAadhaar = async (req, res) => {
  try {
    const userId = req.user._id;
    const { side } = req.body; // 'front' or 'back'

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    if (!side || !['front', 'back'].includes(side)) {
      return res.status(400).json({
        success: false,
        message: 'Please specify side as "front" or "back"',
      });
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Delete old image if exists
    if (side === 'front' && creator.aadhaarFrontPublicId) {
      await deleteFromCloudinary(creator.aadhaarFrontPublicId);
    } else if (side === 'back' && creator.aadhaarBackPublicId) {
      await deleteFromCloudinary(creator.aadhaarBackPublicId);
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      `fyzo/creator-verification/${userId}`
    );

    // Update creator document
    if (side === 'front') {
      creator.aadhaarFrontImage = result.secure_url;
      creator.aadhaarFrontPublicId = result.public_id;
    } else {
      creator.aadhaarBackImage = result.secure_url;
      creator.aadhaarBackPublicId = result.public_id;
    }

    // Update verification status if both sides uploaded
    if (creator.aadhaarFrontImage && creator.aadhaarBackImage) {
      creator.verificationStatus = 'submitted';
      await creator.updateOnboardingStep(4);
    }

    await creator.save();

    res.status(200).json({
      success: true,
      message: `Aadhaar ${side} side uploaded successfully`,
      data: {
        aadhaarFrontImage: creator.aadhaarFrontImage,
        aadhaarBackImage: creator.aadhaarBackImage,
        verificationStatus: creator.verificationStatus,
      },
    });
  } catch (error) {
    console.error('Upload Aadhaar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading Aadhaar document',
      error: error.message,
    });
  }
};

// @desc    Submit bank details (Step 5: Banking - UPI or Bank Account)
// @route   PUT /api/v1/creator/onboarding/bank-details
// @access  Private
exports.submitBankDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { payoutMethod, upiId, accountHolderName, bankName, accountNumber, ifscCode } = req.body;

    // Validate payout method
    if (!payoutMethod || !['upi', 'bank'].includes(payoutMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Please specify payout method as "upi" or "bank"',
      });
    }

    // Validation based on payout method
    if (payoutMethod === 'upi') {
      if (!upiId) {
        return res.status(400).json({
          success: false,
          message: 'UPI ID is required',
        });
      }

      // Validate UPI ID format
      if (!upiId.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UPI ID format (e.g., username@upi)',
        });
      }
    } else {
      // Bank account validation
      if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
        return res.status(400).json({
          success: false,
          message: 'All bank details are required',
        });
      }

      // Validate IFSC code format (11 characters, alphanumeric)
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid IFSC code format',
        });
      }

      // Validate account number (9-18 digits)
      if (!/^\d{9,18}$/.test(accountNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Account number must be 9-18 digits',
        });
      }
    }

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Save payout details based on method
    if (payoutMethod === 'upi') {
      creator.bankDetails = {
        payoutMethod: 'upi',
        upiId: upiId.trim(),
        verified: false, // Will be verified by admin
      };
    } else {
      creator.bankDetails = {
        payoutMethod: 'bank',
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        verified: false, // Will be verified by admin
      };
    }

    await creator.updateOnboardingStep(5);

    // Mark onboarding as completed
    await creator.completeOnboarding();

    // Update verification status to 'submitted' after completing onboarding
    // This will show "Under Review" on the profile, even if Aadhaar wasn't uploaded
    creator.verificationStatus = 'submitted';

    // Update user role to creator
    await User.findByIdAndUpdate(userId, { role: 'creator' });

    await creator.save();

    res.status(200).json({
      success: true,
      message: 'Payout details submitted successfully! Onboarding completed.',
      data: {
        bankDetails: creator.bankDetails,
        onboardingCompleted: creator.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Submit bank details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting payout details',
      error: error.message,
    });
  }
};

// @desc    Get creator profile
// @route   GET /api/v1/creator/profile
// @access  Private
exports.getCreatorProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const creator = await Creator.findOne({ userId }).populate(
      'userId',
      'name email mobile profileImage'
    );

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Format response with proper fallbacks
    const responseData = {
      ...creator.toObject(),
      // Ensure profilePhoto is set - fallback to user's profileImage if creator doesn't have one
      profilePhoto: creator.profilePhoto || creator.userId?.profileImage || null,
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get creator profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching creator profile',
      error: error.message,
    });
  }
};

// @desc    Get onboarding status
// @route   GET /api/v1/creator/onboarding/status
// @access  Private
exports.getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(200).json({
        success: true,
        data: {
          exists: false,
          onboardingStep: 0,
          onboardingCompleted: false,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        exists: true,
        onboardingStep: creator.onboardingStep,
        onboardingCompleted: creator.onboardingCompleted,
        verificationStatus: creator.verificationStatus,
        primaryCategory: creator.primaryCategory,
        displayName: creator.displayName,
      },
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching onboarding status',
      error: error.message,
    });
  }
};

// @desc    Get creator by ID (public endpoint with services)
// @route   GET /api/v1/creator/:id
// @access  Public
exports.getCreatorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find creator and populate user data
    const creator = await Creator.findById(id)
      .populate('userId', 'name email profileImage mobile')
      .lean();

    // Manually fetch category if primaryCategory exists
    if (creator && creator.primaryCategory) {
      const Category = require('../models/Category');
      const category = await Category.findOne({ id: creator.primaryCategory, isActive: true }).lean();
      creator.primaryCategory = category;
    }

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    // Check if creator is active and verified
    if (!creator.isActive || creator.verificationStatus !== 'verified') {
      return res.status(404).json({
        success: false,
        message: 'Creator not available',
      });
    }

    // Get creator's services (you'll need to import your Service model)
    // For now, returning empty array - you can populate this when Service model is available
    const services = []; // TODO: Add Service.find({ creatorId: id, isActive: true })

    // Format response
    const creatorData = {
      id: creator._id,
      name: creator.displayName || creator.userId.name,
      email: creator.userId.email,
      mobile: creator.userId.mobile,
      specialty: creator.tagline || '',
      category: creator.primaryCategory?.label || creator.primaryCategory || '',
      categoryId: creator.primaryCategory?.id || creator.primaryCategory || '',
      bio: creator.bio || '',
      profilePhoto: creator.profilePhoto || creator.userId.profileImage || '',
      coverPhoto: creator.coverPhoto || '',
      bannerImage: creator.bannerImage || '',
      verified: creator.verificationStatus === 'verified',
      rating: creator.averageRating || 0,
      totalReviews: creator.totalReviews || 0,
      totalSales: creator.totalSales || 0,
      expertiseTags: creator.expertiseTags || [],
      storeHandle: creator.storeHandle || '',
      services: services,
      showVideoButton: creator.showVideoButton !== false, // Default to true if not set
      showMessageButton: creator.showMessageButton !== false, // Default to true if not set
      introVideo: creator.introVideo || null,
      introVideoDuration: creator.introVideoDuration || null,
      createdAt: creator.createdAt,
    };

    res.status(200).json({
      success: true,
      data: creatorData,
    });
  } catch (error) {
    console.error('Get creator by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching creator details',
      error: error.message,
    });
  }
};

// @desc    Get all verified creators (public endpoint)
// @route   GET /api/v1/creator/verified
// @access  Public
exports.getVerifiedCreators = async (req, res) => {
  try {
    const { category, search, limit = 50, page = 1 } = req.query;
    
    // Build query
    const query = {
      verificationStatus: 'verified',
      isActive: true,
      onboardingCompleted: true,
    };
    
    // Filter by category if provided
    if (category && category !== 'all') {
      query.primaryCategory = category;
    }
    
    // Add search if provided - MUST be added BEFORE creating the query
    if (search && search.trim()) {
      query.$or = [
        { displayName: { $regex: search.trim(), $options: 'i' } },
        { tagline: { $regex: search.trim(), $options: 'i' } },
        { expertiseTags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch creators with search applied
    const creators = await Creator.find(query)
      .populate('userId', 'name email profileImage')
      .select('displayName tagline primaryCategory profilePhoto expertiseTags averageRating totalReviews totalSales verificationStatus')
      .sort({ totalSales: -1, averageRating: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually fetch categories for all creators
    const Category = require('../models/Category');
    const categoryIds = [...new Set(creators.map(c => c.primaryCategory).filter(Boolean))];
    const categories = await Category.find({ id: { $in: categoryIds }, isActive: true }).lean();
    const categoryMap = Object.fromEntries(categories.map(cat => [cat.id, cat]));
    
    // Attach category data to creators
    creators.forEach(creator => {
      if (creator.primaryCategory && categoryMap[creator.primaryCategory]) {
        creator.primaryCategory = categoryMap[creator.primaryCategory];
      }
    });
    
    const totalCount = await Creator.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: creators,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get verified creators error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verified creators',
      error: error.message,
    });
  }
};

// @desc    Skip verification (optional step)
// @route   POST /api/v1/creator/onboarding/skip-verification
// @access  Private
exports.skipVerification = async (req, res) => {
  try {
    const userId = req.user._id;

    let creator = await Creator.findOne({ userId });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Mark onboarding as completed even without verification
    await creator.completeOnboarding();

    // Update user role to creator
    await User.findByIdAndUpdate(userId, { role: 'creator' });

    res.status(200).json({
      success: true,
      message: 'Verification skipped. You can verify later from settings.',
      data: {
        onboardingCompleted: creator.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Skip verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error skipping verification',
      error: error.message,
    });
  }
};

module.exports = exports;
