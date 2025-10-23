const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 6+ doesn't need these options anymore, but keeping for reference
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`
    ╔════════════════════════════════════════╗
    ║   MongoDB Atlas Connected              ║
    ║   Host: ${conn.connection.host.padEnd(27)}║
    ║   Database: ${conn.connection.name.padEnd(24)}║
    ╚════════════════════════════════════════╝
    `);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

  } catch (error) {
    console.error('MongoDB Atlas connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
