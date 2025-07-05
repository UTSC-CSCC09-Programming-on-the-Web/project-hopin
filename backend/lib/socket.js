import { io } from "../server.js";
import jwt from "jsonwebtoken";

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

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // Example of handling a custom event
  socket.on("message", (data) => {
    console.log("Message received:", data);
    // Broadcast the message to all connected clients
    io.emit("message", data);
  });
});
