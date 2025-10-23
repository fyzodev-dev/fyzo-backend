const mongoose = require('mongoose');
require('dotenv').config();

async function dropOldIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the sessions collection
    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');

    // Get all indexes
    const indexes = await sessionsCollection.indexes();
    console.log('\n📋 Current indexes:', indexes.map(idx => idx.name));

    // Drop the old 'token_1' index if it exists
    try {
      await sessionsCollection.dropIndex('token_1');
      console.log('✅ Dropped old token_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  token_1 index does not exist (already removed)');
      } else {
        console.log('⚠️  Error dropping token_1 index:', error.message);
      }
    }

    // Show remaining indexes
    const remainingIndexes = await sessionsCollection.indexes();
    console.log('\n📋 Remaining indexes:', remainingIndexes.map(idx => idx.name));

    console.log('\n✅ Index cleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropOldIndexes();
