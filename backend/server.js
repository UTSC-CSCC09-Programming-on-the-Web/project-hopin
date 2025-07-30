import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { authRouter } from "./routes/auth-router.js";
import { userRouter } from "./routes/user-router.js";
import corsOptions from "./utils/corsOptions.js";
import groupRouter from "./routes/group-router.js";
import { setupSocketServer } from "./lib/socket.js";

const PORT = process.env.PORT || 8080;
export const app = express();

app.use(express.json());
app.use(cors(corsOptions));
app.use(express.static("static"));

app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "Backend service healthy" });
});

app.use("/api/groups", groupRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

// websocket setup
const server = http.createServer(app);
setupSocketServer(server);

server.listen(PORT, "0.0.0.0", (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
