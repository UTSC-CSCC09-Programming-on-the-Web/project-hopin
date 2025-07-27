import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  googleAuth,
  signup,
  signin,
  getCurrentUser,
  signout,
  getToken,
  validateToken,
} from "../controllers/auth-controller.js";

export const authRouter = Router();

// Google authentication
authRouter.post("/google", googleAuth);

// User signup
authRouter.post("/signup", signup);

// User signin
authRouter.post("/signin", signin);

// Get current user info (authenticated)
authRouter.get("/me", authenticateToken, getCurrentUser);

// User signout
authRouter.post("/signout", authenticateToken, signout);

// Get token for authenticated user (for NextAuth integration)
authRouter.post("/get-token", getToken);

// Validate token
authRouter.post("/validate-token", authenticateToken, validateToken);
