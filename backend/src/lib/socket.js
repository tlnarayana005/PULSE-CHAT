import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

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

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {}; // { userId: socketId }

// Helper function to get receiver's socket ID
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle "Typing" Event with payload validation
  socket.on("typing", (data) => {
    if (!data || !data.receiverId) return;
    const receiverSocketId = userSocketMap[data.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId: data.senderId || userId });
    }
  });

  // Handle "Stop Typing" Event with payload validation
  socket.on("stopTyping", (data) => {
    if (!data || !data.receiverId) return;
    const receiverSocketId = userSocketMap[data.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", { senderId: data.senderId || userId });
    }
  });

  // Handle User Disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };

