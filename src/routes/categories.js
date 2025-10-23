const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// @route   GET /api/categories
// @desc    Get all active categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { group, search } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    if (group) {
      query.group = group;
    }
    
    if (search) {
      query.label = { $regex: search, $options: 'i' };
    }
    
    // Fetch categories sorted by sortOrder
    const categories = await Category.find(query)
      .sort({ sortOrder: 1, label: 1 })
      .select('id label icon group description')
      .lean();
    
    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
});

// @route   GET /api/categories/in-use
// @desc    Get only categories that have VERIFIED creators using them
// @access  Public
router.get('/in-use', async (req, res) => {
  try {
    const Creator = require('../models/Creator');
    
    // Get distinct category IDs from VERIFIED Creator collection only
    const categoriesInUse = await Creator.distinct('primaryCategory', {
      primaryCategory: { $exists: true, $ne: null, $ne: '' },
      verificationStatus: 'verified',
      isActive: true,
      onboardingCompleted: true
    });
    
    // Fetch full category details for those IDs
    const categories = await Category.find({
      id: { $in: categoriesInUse },
      isActive: true
    })
      .sort({ sortOrder: 1, label: 1 })
      .select('id label icon group description')
      .lean();
    
    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Get categories in use error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories in use',
      error: error.message,
    });
  }
});

// @route   GET /api/categories/groups
// @desc    Get all category groups
// @access  Public
router.get('/groups', async (req, res) => {
  try {
    const groups = await Category.distinct('group', { isActive: true });
    
    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('Get category groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category groups',
      error: error.message,
    });
  }
});

// @route   GET /api/categories/:id
// @desc    Get single category by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ 
      id: req.params.id, 
      isActive: true 
    }).lean();
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    
    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message,
    });
  }
});

module.exports = router;
