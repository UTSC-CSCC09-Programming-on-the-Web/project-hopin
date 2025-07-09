import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import redisClient from "./redis.js";
import { prisma, userSafeSelect } from "../lib/prisma.js";

export let io;

export const setupSocketServer = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URI,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Verify that the jwt token is valid before allowing the socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload; // Attach user info to the socket object
      next();
    } catch (err) {
      console.error("Socket connection error:", err);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("A user connected:", socket.id);
    const userId = socket.user.id;
    // Store the user's socket ID in Redis for later use
    await redisClient.HSET("userSockets", userId, socket.id, (err) => {
      if (err) {
        console.error("Error storing socket ID in Redis:", err);
        return;
      }
      console.log(`Stored socket ID ${socket.id} for user ${userId}`);
    });

    socket.on("join_group", async (groupId) => {
      // Find the group by ID
      await redisClient.SISMEMBER("groupIds", groupId, async (err, exists) => {
        if (err) {
          g;
          console.error("Error checking group existence in Redis:", err);
          return;
        }
        if (!exists) {
          console.error(`Group ${groupId} does not exist`);
          socket.emit("error", { message: "Group not found" });
          return;
        }
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { userSafeSelect },
      });

      // Join the user to the specific group room
      io.to(groupId).emit("new_member", {
        user,
      });
      socket.join(groupId);
      console.log(`User ${userId} joined group ${groupId}`);
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      await redisClient.HDEL("userSockets", userId);
      console.log("User disconnected:", socket.id);
    });
  });
};
