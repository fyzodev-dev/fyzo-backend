const mongoose = require('mongoose');
require('dotenv').config();

async function resetSessions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the entire sessions collection
    const db = mongoose.connection.db;
    await db.collection('sessions').drop();
    console.log('✅ Dropped sessions collection');

    console.log('✅ Sessions reset completed! The collection will be recreated on next login.');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('ℹ️  Sessions collection does not exist');
      process.exit(0);
    }
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetSessions();
