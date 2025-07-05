import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth-router.js";
import { userRouter } from "./routes/user-router.js";
import corsOptions from "./utils/corsOptions.js";

const PORT = process.env.PORT || 8080;
export const app = express();

app.use(express.json());
app.use(cors(corsOptions));
app.use(express.static("static"));

app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

// Websocket setup
const server = http.createServer(app);
export const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_URI,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

server.listen(PORT, "0.0.0.0", (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
