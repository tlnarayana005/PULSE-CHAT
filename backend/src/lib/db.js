import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const seedDemoUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await User.insertMany([
        {
          fullName: "Alice Johnson",
          email: "alice@example.com",
          password: hashedPassword,
          profilePic: "https://ui-avatars.com/api/?name=Alice+Johnson&background=6366f1&color=fff",
        },
        {
          fullName: "Bob Smith",
          email: "bob@example.com",
          password: hashedPassword,
          profilePic: "https://ui-avatars.com/api/?name=Bob+Smith&background=10b981&color=fff",
        },
        {
          fullName: "Charlie Brown",
          email: "charlie@example.com",
          password: hashedPassword,
          profilePic: "https://ui-avatars.com/api/?name=Charlie+Brown&background=f59e0b&color=fff",
        },
      ]);
      console.log("Demo users seeded successfully.");
    }
  } catch (err) {
    console.log("Failed to seed demo users:", err.message);
  }
};

let mongoServerInstance = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  if (process.env.MONGODB_URL) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URL, {
        serverSelectionTimeoutMS: 2500,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      await seedDemoUsers();
      return;
    } catch (error) {
      console.log("Local/Cloud MongoDB connection failed, starting MongoMemoryServer...");
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }

  try {
    if (!mongoServerInstance) {
      mongoServerInstance = await MongoMemoryServer.create();
    }
    const mongoUri = mongoServerInstance.getUri();
    const conn = await mongoose.connect(mongoUri);
    console.log(`In-Memory MongoDB connected: ${conn.connection.host}`);
    await seedDemoUsers();
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServerInstance) {
      await mongoServerInstance.stop();
    }
  } catch (error) {
    console.log("Error disconnecting database:", error.message);
  }
};
