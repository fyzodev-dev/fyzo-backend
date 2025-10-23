// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./src/config/database");

// Load env
dotenv.config();

// Kick off Mongo (non-blocking)
connectDB();

const app = express();

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
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

// API routes
app.use("/api/v1/auth", require("./src/routes/authRoutes"));
app.use("/api/v1/user", require("./src/routes/userRoutes"));
app.use("/api/v1/creator", require("./src/routes/creatorRoutes"));
app.use("/api/v1/categories", require("./src/routes/categories"));
app.use("/api/v1/favorites", require("./src/routes/favoriteRoutes"));

// Root
app.get("/", (_req, res) => {
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

// Start server – bind to 0.0.0.0 and Render's PORT
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `\nFYZO backend listening on ${PORT} (${process.env.NODE_ENV || "development"})\n`
  );
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
