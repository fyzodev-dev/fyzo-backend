const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceInfo: {
      deviceType: String, // 'mobile', 'web', 'tablet'
      deviceName: String,
      os: String,
      browser: String,
      ipAddress: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired sessions

// Update last activity
sessionSchema.methods.updateActivity = function () {
  this.lastActivity = Date.now();
  return this.save();
};

// Deactivate session
sessionSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Static method to cleanup inactive sessions
sessionSchema.statics.cleanupInactiveSessions = async function () {
  const result = await this.deleteMany({
    $or: [
      { isActive: false },
      { expiresAt: { $lt: new Date() } },
    ],
  });
  return result.deletedCount;
};

// Static method to deactivate user sessions
sessionSchema.statics.deactivateUserSessions = async function (userId) {
  const result = await this.updateMany(
    { user: userId, isActive: true },
    { isActive: false }
  );
  return result.modifiedCount;
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
