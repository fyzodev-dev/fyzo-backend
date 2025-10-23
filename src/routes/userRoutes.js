const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  updateNotificationPreferences,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Profile photo routes
router.post('/upload-profile-photo', upload.single('profilePhoto'), uploadProfilePhoto);
router.delete('/remove-profile-photo', removeProfilePhoto);

// Notification preferences
router.put('/notification-preferences', updateNotificationPreferences);

module.exports = router;
