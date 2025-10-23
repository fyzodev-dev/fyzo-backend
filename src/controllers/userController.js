const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

// @desc    Get user profile
// @route   GET /api/v1/user/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/user/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {name, mobile, bio, location, website, interests } = req.body;

    // Validate input
    if (name && (name.length < 2 || name.length > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters',
      });
    }

    if (mobile && !/^\d{10}$/.test(mobile.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits',
      });
    }

    if (bio && bio.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Bio cannot exceed 200 characters',
      });
    }

    // Update user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (mobile) user.mobile = mobile.replace(/\s/g, '');
    if (bio !== undefined) user.bio = bio.trim();
    if (location !== undefined) user.location = location.trim();
    if (website !== undefined) user.website = website.trim();
    if (interests && Array.isArray(interests)) user.interests = interests;

    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(user._id).select('-password -otp -otpExpiry');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/v1/user/upload-profile-photo
// @access  Private
exports.uploadProfilePhoto = async (req, res) => {
  try {
    console.log('📸 Upload request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers['content-type']);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete old profile image from Cloudinary if exists
    if (user.profileImage && user.cloudinaryPublicId) {
      await deleteFromCloudinary(user.cloudinaryPublicId);
    }

    // Upload new image to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      'fyzo/profile-photos'
    );

    // Update user profile image
    user.profileImage = result.secure_url;
    user.cloudinaryPublicId = result.public_id;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profileImage: user.profileImage,
        cloudinaryPublicId: user.cloudinaryPublicId,
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

// @desc    Remove profile photo
// @route   DELETE /api/v1/user/remove-profile-photo
// @access  Private
exports.removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete from Cloudinary if exists
    if (user.cloudinaryPublicId) {
      await deleteFromCloudinary(user.cloudinaryPublicId);
    }

    // Remove from user document
    user.profileImage = undefined;
    user.cloudinaryPublicId = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully',
    });
  } catch (error) {
    console.error('Remove profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing profile photo',
      error: error.message,
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/user/notification-preferences
// @access  Private
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { pushNotifications, emailUpdates, courseReminders, promoOffers } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update notification preferences
    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    if (pushNotifications !== undefined) user.notificationPreferences.pushNotifications = pushNotifications;
    if (emailUpdates !== undefined) user.notificationPreferences.emailUpdates = emailUpdates;
    if (courseReminders !== undefined) user.notificationPreferences.courseReminders = courseReminders;
    if (promoOffers !== undefined) user.notificationPreferences.promoOffers = promoOffers;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.notificationPreferences,
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences',
      error: error.message,
    });
  }
};
