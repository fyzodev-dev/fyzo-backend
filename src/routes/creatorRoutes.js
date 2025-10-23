const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  initializeCreatorProfile,
  updateCreatorProfile,
  updateCreatorSetup,
  uploadProfilePhoto,
  uploadBannerImage,
  uploadIntroVideo,
  deleteIntroVideo,
  uploadAadhaar,
  submitBankDetails,
  getCreatorProfile,
  getOnboardingStatus,
  skipVerification,
  getVerifiedCreators,
  getCreatorById,
} = require('../controllers/creatorController');

// Public routes - specific routes MUST come before /:id wildcard
router.get('/verified', getVerifiedCreators);
router.get('/profile', protect, getCreatorProfile);

// Onboarding routes - these MUST come before /:id wildcard
router.post('/onboarding/initialize', protect, initializeCreatorProfile);
router.put('/onboarding/profile', protect, updateCreatorProfile);
router.put('/onboarding/setup', protect, updateCreatorSetup);
router.post(
  '/onboarding/upload-profile-photo',
  protect,
  upload.single('profilePhoto'),
  uploadProfilePhoto
);
router.post(
  '/onboarding/upload-banner-image',
  protect,
  upload.single('bannerImage'),
  uploadBannerImage
);
router.post('/onboarding/upload-intro-video', protect, uploadIntroVideo);
router.delete('/onboarding/delete-intro-video', protect, deleteIntroVideo);
router.post('/onboarding/upload-aadhaar', protect, upload.single('aadhaarDocument'), uploadAadhaar);
router.put('/onboarding/bank-details', protect, submitBankDetails);
router.get('/onboarding/status', protect, getOnboardingStatus);
router.post('/onboarding/skip-verification', protect, skipVerification);

// Dynamic route - MUST be last to avoid catching specific routes above
router.get('/:id', getCreatorById);

module.exports = router;
