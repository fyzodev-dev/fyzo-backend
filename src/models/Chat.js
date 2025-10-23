const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['user', 'creator'],
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Creator',
      required: true,
    },
    lastMessage: {
      content: String,
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      timestamp: Date,
      type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file'],
        default: 'text',
      },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ creatorId: 1 });
chatSchema.index({ updatedAt: -1 });

// Get participant IDs
chatSchema.methods.getParticipantIds = function () {
  return this.participants.map((p) => p.userId.toString());
};

// Check if user is participant
chatSchema.methods.isParticipant = function (userId) {
  return this.participants.some((p) => p.userId.toString() === userId.toString());
};

// Get other participant
chatSchema.methods.getOtherParticipant = function (userId) {
  return this.participants.find((p) => p.userId.toString() !== userId.toString());
};

module.exports = mongoose.model('Chat', chatSchema);
