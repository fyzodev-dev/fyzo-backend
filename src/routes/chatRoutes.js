const express = require('express');
const router = express.Router();
const {
  getOrCreateChat,
  getMyChats,
  getChatById,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  toggleBlockChat,
  getUnreadCount,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Chat routes
router.post('/get-or-create', getOrCreateChat);
router.get('/', getMyChats);
router.get('/unread-count', getUnreadCount);
router.get('/:chatId', getChatById);
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/messages', sendMessage);
router.put('/:chatId/mark-read', markMessagesAsRead);
router.delete('/:chatId/messages/:messageId', deleteMessage);
router.put('/:chatId/block', toggleBlockChat);

module.exports = router;
