import { prisma } from "../lib/prisma.js";
import { invalidateJWT, signJWT } from "../utils/jwt.js";
import { blacklistToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";
import {
  consumeFailedAttempts,
  resetFailAttempts,
  checkRateLimit,
} from "../middleware/rate-limit.js";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "../utils/validateInput.js";
import jwt from "jsonwebtoken";
import redisClient from "../lib/redisClient.js";

// Google authentication (upsert user)
export async function googleAuth(req, res, next) {
  const { email: rawEmail, name: rawName } = req.body;

  try {
    // Validate and sanitize inputs
    let email, name;
    try {
      email = validateEmail(rawEmail);
      name = validateName(rawName);
    } catch (validationError) {
      await consumeFailedAttempts(req);
      return res.status(400).json({ error: validationError.message });
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name },
      update: { name },
    });

    // Generate a JWT token for the user
    const token = await signJWT(user.id, user.email);

    await resetFailAttempts(req);

    res.status(200).json({
      id: user.id,
      accessToken: token,
    });
  } catch (error) {
    await consumeFailedAttempts(req);
    console.error("Error in Google authentication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// User signup
export async function signup(req, res, next) {
  try {
    const { name: rawName, email: rawEmail, password } = req.body;

    // Validate and sanitize inputs
    let name, email;
    try {
      name = validateName(rawName);
      email = validateEmail(rawEmail);
      validatePassword(password); // Password validation only, no sanitization
    } catch (validationError) {
      if (await checkRateLimit(req, res)) return;
      return res.status(400).json({ error: validationError.message });
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

    await resetFailAttempts(req);

    res.status(201).json({
      message: "User created successfully",
      user: { email, name },
    });
  } catch (error) {
    console.error("Signup error:", error);
    await consumeFailedAttempts(req);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// User signin
export async function signin(req, res, next) {
  const { email: rawEmail, password } = req.body;

  try {
    // Validate and sanitize email
    let email;
    try {
      email = validateEmail(rawEmail);
    } catch (validationError) {
      if (await checkRateLimit(req, res)) return;
      return res.status(400).json({ message: validationError.message });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      if (await checkRateLimit(req, res)) return;
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      if (await checkRateLimit(req, res)) return;
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Invalidate old token (rotate jti on login)
    const oldToken = req.headers["authorization"]?.split(" ")[1];
    if (oldToken) await invalidateJWT(oldToken);

    // Generate a JWT token for the user
    const token = await signJWT(user.id, user.email);

    await resetFailAttempts(req);

    // Don't return the password
    return res.json({
      id: user.id,
      accessToken: token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    await consumeFailedAttempts(req);
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
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    await resetFailAttempts(req);

    return res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    await consumeFailedAttempts(req);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// User signout
export async function signout(req, res, next) {
  try {
    // Get the JWT token from the request
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      await invalidateJWT(token);
      // Add token to blacklist using the shared function
      // await blacklistToken.add(token);
      // console.log("Token blacklisted:", token.substring(0, 20) + "...");
    }

    // Set cache control headers to prevent caching of authenticated pages
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    await resetFailAttempts(req);

    return res.json({
      message: "Signed out successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Signout error:", error);
    await consumeFailedAttempts(req);
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
    if (await checkRateLimit(req, res)) return;
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a new token for this user
    const token = await signJWT(user.id, user.email);

    await resetFailAttempts(req);

    return res.json({ token });
  } catch (err) {
    console.error("Error getting token:", err);
    await consumeFailedAttempts(req);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Validate token
export async function validateToken(req, res, next) {
  await resetFailAttempts(req);
  return res.json({ valid: true, user: req.user });
}
