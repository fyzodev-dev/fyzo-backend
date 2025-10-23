const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['user', 'creator'],
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type === 'text';
      },
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file'],
      default: 'text',
    },
    mediaUrl: {
      type: String,
      required: function () {
        return this.type !== 'text';
      },
    },
    mediaMetadata: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      duration: Number, // For audio/video
      dimensions: {
        width: Number,
        height: Number,
      },
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

// Check if message is read by user
messageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((r) => r.userId.toString() === userId.toString());
};

// Mark as read by user
messageSchema.methods.markAsRead = function (userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({ userId, readAt: new Date() });
  }
};

module.exports = mongoose.model('Message', messageSchema);
