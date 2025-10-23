const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Creator = require('../models/Creator');

// @desc    Get or create chat between user and creator
// @route   POST /api/v1/chats/get-or-create
// @access  Private
exports.getOrCreateChat = async (req, res) => {
  try {
    const { creatorId } = req.body;
    const userId = req.user._id;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required',
      });
    }

    // Check if creator exists
    const creator = await Creator.findById(creatorId);
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      creatorId,
      'participants.userId': { $all: [userId, creator.userId] },
    })
      .populate('participants.userId', 'name email profileImage')
      .populate('creatorId', 'displayName profileImage verificationStatus');

    // Create new chat if doesn't exist
    if (!chat) {
      chat = await Chat.create({
        participants: [
          { userId: userId, role: 'user' },
          { userId: creator.userId, role: 'creator' },
        ],
        creatorId: creatorId,
        unreadCount: new Map([
          [userId.toString(), 0],
          [creator.userId.toString(), 0],
        ]),
      });

      // Populate after creation
      chat = await Chat.findById(chat._id)
        .populate('participants.userId', 'name email profileImage')
        .populate('creatorId', 'displayName profileImage verificationStatus');
    }

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error('Get or create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get or create chat',
      error: error.message,
    });
  }
};

// @desc    Get all chats for logged-in user
// @route   GET /api/v1/chats
// @access  Private
exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const chats = await Chat.find({
      'participants.userId': userId,
      isActive: true,
    })
      .populate('participants.userId', 'name email profileImage')
      .populate('creatorId', 'displayName profileImage verificationStatus primaryCategory')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Chat.countDocuments({
      'participants.userId': userId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get my chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chats',
      error: error.message,
    });
  }
};

// @desc    Get single chat by ID
// @route   GET /api/v1/chats/:chatId
// @access  Private
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('participants.userId', 'name email profileImage')
      .populate('creatorId', 'displayName profileImage verificationStatus primaryCategory');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error('Get chat by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat',
      error: error.message,
    });
  }
};

// @desc    Get messages for a chat
// @route   GET /api/v1/chats/:chatId/messages
// @access  Private
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get messages
    const messages = await Message.find({
      chatId,
      deletedFor: { $ne: userId },
    })
      .populate('senderId', 'name profileImage')
      .populate('replyTo', 'content senderId type')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Message.countDocuments({
      chatId,
      deletedFor: { $ne: userId },
    });

    // Mark unread messages as read
    const unreadMessages = messages.filter((msg) => !msg.isReadBy(userId));
    for (const msg of unreadMessages) {
      msg.markAsRead(userId);
      await msg.save();
    }

    // Update unread count in chat
    const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
    if (unreadCount > 0) {
      chat.unreadCount.set(userId.toString(), 0);
      await chat.save();
    }

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message,
    });
  }
};

// @desc    Send a message
// @route   POST /api/v1/chats/:chatId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { content, type = 'text', mediaUrl, mediaMetadata, replyTo } = req.body;

    // Validate input
    if (type === 'text' && !content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    if (type !== 'text' && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Media URL is required for non-text messages',
      });
    }

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Determine sender role
    const participant = chat.participants.find(
      (p) => p.userId.toString() === userId.toString()
    );
    const senderRole = participant.role;

    // Create message
    const message = await Message.create({
      chatId,
      senderId: userId,
      senderRole,
      content,
      type,
      mediaUrl,
      mediaMetadata,
      replyTo,
      readBy: [{ userId, readAt: new Date() }],
    });

    // Update chat's last message and unread counts
    chat.lastMessage = {
      content: type === 'text' ? content : `Sent ${type}`,
      senderId: userId,
      timestamp: new Date(),
      type,
    };

    // Increment unread count for other participants
    const otherParticipant = chat.getOtherParticipant(userId);
    if (otherParticipant) {
      const otherUserId = otherParticipant.userId.toString();
      const currentCount = chat.unreadCount.get(otherUserId) || 0;
      chat.unreadCount.set(otherUserId, currentCount + 1);
    }

    await chat.save();

    // Populate sender details
    await message.populate('senderId', 'name profileImage');
    if (replyTo) {
      await message.populate('replyTo', 'content senderId type');
    }

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/v1/chats/:chatId/mark-read
// @access  Private
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { messageIds } = req.body;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Mark messages as read
    if (messageIds && messageIds.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chatId,
          'readBy.userId': { $ne: userId },
        },
        {
          $push: { readBy: { userId, readAt: new Date() } },
        }
      );
    }

    // Reset unread count
    chat.unreadCount.set(userId.toString(), 0);
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message,
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/v1/chats/:chatId/messages/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user._id;
    const { deleteForEveryone = false } = req.body;

    const message = await Message.findOne({ _id: messageId, chatId });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user is sender for "delete for everyone"
    if (deleteForEveryone && message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages for everyone',
      });
    }

    if (deleteForEveryone) {
      message.isDeleted = true;
      message.content = 'This message was deleted';
    } else {
      // Delete for this user only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message,
    });
  }
};

// @desc    Block/Unblock chat
// @route   PUT /api/v1/chats/:chatId/block
// @access  Private
exports.toggleBlockChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Toggle block status
    chat.isBlocked = !chat.isBlocked;
    chat.blockedBy = chat.isBlocked ? userId : null;
    await chat.save();

    res.status(200).json({
      success: true,
      message: chat.isBlocked ? 'Chat blocked successfully' : 'Chat unblocked successfully',
      data: { isBlocked: chat.isBlocked },
    });
  } catch (error) {
    console.error('Toggle block chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle block status',
      error: error.message,
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/v1/chats/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      'participants.userId': userId,
      isActive: true,
    });

    let totalUnread = 0;
    for (const chat of chats) {
      const count = chat.unreadCount.get(userId.toString()) || 0;
      totalUnread += count;
    }

    res.status(200).json({
      success: true,
      data: { unreadCount: totalUnread },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};
