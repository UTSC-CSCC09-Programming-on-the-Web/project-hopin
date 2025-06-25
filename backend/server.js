import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import { authRouter } from "./routes/auth-router.js";
import { userRouter } from "./routes/user-router.js";

const PORT = 8080;
export const app = express();

// Middleware
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(
  session({
    secret: process.env.SECRET_KEY || "hopinc09",
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(express.static("static"));

// app.use("/api/here", router);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.get("/api/home", (req, res) => {
  res.json({ message: "Testing" });
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
