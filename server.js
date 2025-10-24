const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const socketIO = require('socket.io');
// const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/database');
const Chat = require('./src/models/Chat');
const Message = require('./src/models/Message');

// Load env
dotenv.config();

// Kick off Mongo (non-blocking)
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO Configuration
const io = socketIO(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  pingTimeout: 60000,
});

// Make io accessible to routes
app.set('io', io);

// Security & hygiene
app.use(helmet());
app.use(mongoSanitize());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Health check (use this in Render settings)
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "FYZO Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/user', require('./src/routes/userRoutes'));
app.use('/api/v1/creator', require('./src/routes/creatorRoutes'));
app.use('/api/v1/categories', require('./src/routes/categories'));
app.use('/api/v1/favorites', require('./src/routes/favoriteRoutes'));
app.use('/api/v1/chats', require('./src/routes/chatRoutes'));
// app.use('/api/v1/courses', require('./routes/courseRoutes'));
// app.use('/api/v1/bookings', require('./routes/bookingRoutes'));

// Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to FYZO Backend API",
    version: process.env.API_VERSION || "v1",
    documentation: "/api-docs",
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Socket.IO Connection Handling

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins with their userId
  socket.on('user:join', async (userId) => {
    try {
      console.log(`👤 User ${userId} joined`);
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Join user's chat rooms
      const chats = await Chat.find({ 'participants.userId': userId });
      chats.forEach((chat) => {
        socket.join(chat._id.toString());
      });

      // Send online status to all user's chats
      socket.broadcast.emit('user:online', userId);
    } catch (error) {
      console.error('User join error:', error);
    }
  });

  // Join specific chat room
  socket.on('chat:join', (chatId) => {
    console.log(`💬 User ${socket.userId} joined chat ${chatId}`);
    socket.join(chatId);
  });

  // Leave chat room
  socket.on('chat:leave', (chatId) => {
    console.log(`👋 User ${socket.userId} left chat ${chatId}`);
    socket.leave(chatId);
  });

  // Typing indicator
  socket.on('typing:start', ({ chatId, userId }) => {
    socket.to(chatId).emit('typing:start', { chatId, userId });
  });

  socket.on('typing:stop', ({ chatId, userId }) => {
    socket.to(chatId).emit('typing:stop', { chatId, userId });
  });

  // New message event (real-time broadcast)
  socket.on('message:send', async (data) => {
    try {
      const { chatId, messageId } = data;
      
      // Fetch the full message with populated data
      const message = await Message.findById(messageId)
        .populate('senderId', 'name profileImage')
        .populate('replyTo', 'content senderId type');

      // Broadcast to all users in the chat room except sender
      socket.to(chatId).emit('message:new', {
        chatId,
        message,
      });

      console.log(`📨 Message sent to chat ${chatId}`);
    } catch (error) {
      console.error('Message send error:', error);
    }
  });

  // Message read event
  socket.on('message:read', async (data) => {
    try {
      const { chatId, userId, messageIds } = data;
      
      // Broadcast to other participants
      socket.to(chatId).emit('message:read', {
        chatId,
        userId,
        messageIds,
      });

      console.log(`✅ Messages marked as read in chat ${chatId}`);
    } catch (error) {
      console.error('Message read error:', error);
    }
  });

  // Message deleted event
  socket.on('message:delete', (data) => {
    const { chatId, messageId } = data;
    socket.to(chatId).emit('message:delete', {
      chatId,
      messageId,
    });
  });

  // User disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      // Broadcast offline status
      socket.broadcast.emit('user:offline', socket.userId);
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
    ╔════════════════════════════════════════╗
    ║   FYZO Backend Server Started          ║
    ║   Port: ${PORT}                         ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}        ║
    ║   Database: MongoDB Atlas              ║
    ╚════════════════════════════════════════╝
  `);
});

// Hardening: process-level handlers
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err?.message || err);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.message || err);
  process.exit(1);
});

module.exports = app;
