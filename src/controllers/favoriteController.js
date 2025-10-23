const Favorite = require('../models/Favorite');
const Creator = require('../models/Creator');

// @desc    Get user's favorite creators
// @route   GET /api/v1/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all favorites for the user and populate creator details
    const favorites = await Favorite.find({ userId })
      .populate({
        path: 'creatorId',
        populate: {
          path: 'userId',
          select: 'name email profileImage',
        },
        select: 'displayName tagline primaryCategory profilePhoto expertiseTags averageRating totalReviews totalSales verificationStatus',
      })
      .sort({ createdAt: -1 });

    // Filter out any favorites where creator is null (deleted creators)
    const validFavorites = favorites.filter(fav => fav.creatorId);

    // Manually fetch and attach category data for each creator
    const Category = require('../models/Category');
    for (const favorite of validFavorites) {
      if (favorite.creatorId && favorite.creatorId.primaryCategory) {
        const category = await Category.findOne({ 
          id: favorite.creatorId.primaryCategory, 
          isActive: true 
        }).lean();
        if (category) {
          favorite.creatorId.primaryCategory = category;
        }
      }
    }

    // Extract just the creator data
    const creators = validFavorites.map(fav => fav.creatorId);

    res.status(200).json({
      success: true,
      count: creators.length,
      data: creators,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites',
      error: error.message,
    });
  }
};

// @desc    Add creator to favorites
// @route   POST /api/v1/favorites/:creatorId
// @access  Private
exports.addFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { creatorId } = req.params;

    // Check if creator exists and is verified
    const creator = await Creator.findById(creatorId);
    
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    if (creator.verificationStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Only verified creators can be added to favorites',
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ userId, creatorId });
    
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Creator already in favorites',
      });
    }

    // Create favorite
    const favorite = await Favorite.create({
      userId,
      creatorId,
    });

    res.status(201).json({
      success: true,
      message: 'Added to favorites successfully',
      data: favorite,
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding to favorites',
      error: error.message,
    });
  }
};

// @desc    Remove creator from favorites
// @route   DELETE /api/v1/favorites/:creatorId
// @access  Private
exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { creatorId } = req.params;

    const favorite = await Favorite.findOneAndDelete({ userId, creatorId });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Removed from favorites successfully',
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from favorites',
      error: error.message,
    });
  }
};

// @desc    Check if creator is favorited
// @route   GET /api/v1/favorites/check/:creatorId
// @access  Private
exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { creatorId } = req.params;

    const favorite = await Favorite.findOne({ userId, creatorId });

    res.status(200).json({
      success: true,
      isFavorite: !!favorite,
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking favorite status',
      error: error.message,
    });
  }
};

// @desc    Toggle favorite status
// @route   POST /api/v1/favorites/toggle/:creatorId
// @access  Private
exports.toggleFavorite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { creatorId } = req.params;

    // Check if creator exists and is verified
    const creator = await Creator.findById(creatorId);
    
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    if (creator.verificationStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Only verified creators can be favorited',
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ userId, creatorId });
    
    if (existingFavorite) {
      // Remove from favorites
      await existingFavorite.deleteOne();
      return res.status(200).json({
        success: true,
        isFavorite: false,
        message: 'Removed from favorites',
      });
    } else {
      // Add to favorites
      await Favorite.create({ userId, creatorId });
      return res.status(201).json({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling favorite',
      error: error.message,
    });
  }
};
