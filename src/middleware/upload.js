const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  // Primary check: MIME type (more reliable for web uploads)
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  
  // Secondary check: File extension (for additional validation)
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|webm|mkv/;
  const extname = path.extname(file.originalname).toLowerCase();
  
  // Accept if MIME type is correct, even if extension is missing/wrong
  if (isImage || isVideo) {
    // Validate extension if it exists
    if (extname) {
      const hasValidExtension = allowedImageTypes.test(extname) || allowedVideoTypes.test(extname);
      if (!hasValidExtension) {
        console.log('⚠️  File has valid MIME but invalid extension:', file.originalname, 'Type:', file.mimetype);
      }
    }
    console.log('✅ File accepted:', file.originalname, 'Type:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File rejected:', file.originalname, 'Type:', file.mimetype);
    cb(new Error('Only image and video files are allowed'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for videos)
  },
  fileFilter: fileFilter,
});

module.exports = upload;
