import { prisma } from "../lib/prisma.js";
import { signJWT } from "../utils/jwt.js";
import { blacklistToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";

// TODO: failedAttempts & lockout user from account

// Google authentication (upsert user)
export async function googleAuth(req, res, next) {
  const { email, name } = req.body;

  try {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name },
      update: { name },
    });

    // Generate a JWT token for the user
    const token = signJWT(user.id, user.email);

    res.status(200).json({
      id: user.id,
      accessToken: token,
    });
  } catch (error) {
    console.error("Error in Google authentication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// User signup
export async function signup(req, res, next) {
  try {
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

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Do not generate the token here, as the user is not logged in yet.
    // Instead, the user will log in immediately after signing up.

    res.status(201).json({
      message: "User created successfully",
      user: { email, name },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// User signin
export async function signin(req, res, next) {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token for the user
    const token = signJWT(user.id, user.email);

    // Don't return the password
    return res.json({
      id: user.id,
      accessToken: token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get current user info (authenticated)
export async function getCurrentUser(req, res, next) {
  const userId = req.user.id;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// User signout
export async function signout(req, res, next) {
  try {
    // Get the JWT token from the request
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      // Add token to blacklist using the shared function
      blacklistToken.add(token);
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
}

// Get token for authenticated user (for NextAuth integration)
export async function getToken(req, res, next) {
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
    const token = signJWT(user.id, user.email);

    return res.json({ token });
  } catch (err) {
    console.error("Error getting token:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Validate token
export async function validateToken(req, res, next) {
  return res.json({ valid: true, user: req.user });
}
