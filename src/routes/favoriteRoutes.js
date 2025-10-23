const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  toggleFavorite,
} = require('../controllers/favoriteController');

// All routes require authentication
router.use(protect);

// Get all favorites
router.get('/', getFavorites);

// Toggle favorite status (most convenient for UI)
router.post('/toggle/:creatorId', toggleFavorite);

// Check if creator is favorited
router.get('/check/:creatorId', checkFavorite);

// Add to favorites
router.post('/:creatorId', addFavorite);

// Remove from favorites
router.delete('/:creatorId', removeFavorite);

module.exports = router;
