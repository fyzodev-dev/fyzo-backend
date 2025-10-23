const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Creator',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can only favorite a creator once
favoriteSchema.index({ userId: 1, creatorId: 1 }, { unique: true });

// Index for faster queries
favoriteSchema.index({ userId: 1 });
favoriteSchema.index({ creatorId: 1 });

module.exports = mongoose.model('Favorite', favoriteSchema);
