// src/config/database.js
const mongoose = require("mongoose");

function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is missing in environment variables.");
    return;
  }

  // Recommended in recent Mongoose versions
  mongoose.set("strictQuery", true);

  // Connection event logs
  mongoose.connection.on("connected", () => {
    const { host, name } = mongoose.connection;
    console.log(`
╔════════════════════════════════════════╗
║   MongoDB Atlas Connected              ║
║   Host: ${String(host).padEnd(27)}║
║   Database: ${String(name).padEnd(24)}║
╚════════════════════════════════════════╝
`);
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err?.message || err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting to reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected successfully");
  });

  // Do not block server start and do not exit on failure.
  // Let the driver retry, and just log the first failure.
  mongoose
    .connect(uri, {
      // Fail fast if URI/network is wrong, so we see logs quickly
      serverSelectionTimeoutMS: 5000,
      // Reasonable pool for small services
      maxPoolSize: 10,
      // Avoid background index builds on boot
      autoIndex: false,
    })
    .catch((err) => {
      console.error("Initial MongoDB connect failed:", err?.message || err);
    });

  return mongoose.connection;
}

module.exports = connectDB;
