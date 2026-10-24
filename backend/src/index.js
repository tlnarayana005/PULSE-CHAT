import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import healthRoutes from "./routes/health.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
};

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Allow both Local and Deployed Frontend
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// API Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// Serve Frontend (if built), otherwise provide API landing response
const frontendDistPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.status(200).json({
      message: "PulseChat API is running",
      health: "/api/health",
    });
  });
}

const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.npm_lifecycle_event === "test" ||
  process.execArgv.includes("--test") ||
  process.argv.includes("--test");

// Start Server (only if not running inside test environment)
if (!isTestEnv) {
  server.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
    connectDB();
  });
}

export { app, server };
