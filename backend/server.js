import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import { authRouter } from "./routes/auth-router.js";
import { userRouter } from "./routes/user-router.js";
import corsOptions from "./utils/corsOptions.js";

const PORT = 8080;
export const app = express();
app.use(express.json());
app.use(cors(corsOptions));
app.use(
  session({
    secret: process.env.SECRET_KEY || "hopinc09",
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(express.static("static"));

app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.url}`);
  next();
});

// app.use("/api/here", router);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.get("/api/home", (req, res) => {
  res.json({ message: "Testing" });
});

app.listen(PORT, "0.0.0.0", (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
