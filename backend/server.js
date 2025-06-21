import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import { prisma } from "./lib/prisma.js";
import { usersRouter } from "./routers/users.js";

const PORT = 8080;
export const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(session({
  secret: process.env.SECRET_KEY || 'hopinc09',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, 
    sameSite: 'lax',
  }
}));
app.use(express.static("static"));

// app.use("/api/here", router);
app.use("/api/users", usersRouter);

app.get("/api/home", (req, res) => {
  res.json({ message: "Testing" });
});

// add new acc from google
app.post("/api/auth/google", async (req, res) => {
  const { email, name } = req.body;

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name },
    update: { name },
  });
  console.log("weve added into prisma");
  res.json(user);
});
app.get("/api/users/by-email", async (req, res) => {
  const email = req.query.email;

  if (typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Error fetching user by email:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});