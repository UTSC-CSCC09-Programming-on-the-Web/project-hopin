import { Router } from "express";
import { prisma } from "../lib/prisma.js"; // import this for singleton prisma
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET;

// add new acc from google
authRouter.post("/google", async (req, res) => {
  const { email, name } = req.body;

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name },
    update: { name },
  });
  console.log("weve added into prisma");
  res.json(user);
});

authRouter.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(401)
      .json({ error: "Email, password and username are required. " });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "User already exists" });
  }

  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  // generate the JWT
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
    expiresIn: "1h",
  });

  res.status(201).json({ token });
});

authRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  // if user doesn't exist
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // if password is invalid
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // get the token
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  // dont want to return the password
  return res.json({ id: user.id, email: user.email, name: user.name });
});

authRouter.get("/by-email", async (req, res) => {
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
