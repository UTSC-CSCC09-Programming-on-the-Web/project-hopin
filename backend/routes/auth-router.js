import { Router } from "express";
import { prisma } from "../lib/prisma.js"; // import this for singleton prisma
import jwt from "jsonwebtoken";
import { authenticateToken, blacklistToken } from "../middleware/auth.js";
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

  try {
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
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      error: error.message || "An error occurred during signup",
      code: error.code,
    });
  }
});

authRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
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
      },
    );

    // Return user data along with the token
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      error: error.message || "An error occurred during signin",
    });
  }
});

authRouter.get("/auth-status", authenticateToken, async (req, res) => {
  // If we get here, the token was verified in the authenticateToken middleware
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true },
    });

    res.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.status(500).json({
      error:
        error.message || "An error occurred checking authentication status",
    });
  }
});

authRouter.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Exclude sensitive fields
    const { password, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

authRouter.post("/signout", authenticateToken, (req, res) => {
  try {
    // Get the JWT token from the request
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      // Add token to blacklist using the shared function
      blacklistToken(token);
      console.log("Token blacklisted:", token.substring(0, 20) + "...");
    }

    // Set cache control headers to prevent caching of authenticated pages
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    return res.json({
      message: "Signed out successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Signout error:", error);
    return res.status(500).json({
      error: "Failed to process signout",
    });
  }
});

// Get a token for an already authenticated user (for NextAuth users)
authRouter.post("/get-token", async (req, res) => {
  // Set cache control headers
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a new token for this user
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    return res.json({ token });
  } catch (err) {
    console.error("Error getting token:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
