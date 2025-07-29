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
import { createRateLimiter } from "../middleware/rate-limit.js";
import { validateRequestSchema } from "../middleware/validate-request-schema.js";
import { handleMiddlewareErrors } from "../middleware/error-handler.js";

export const authRouter = Router();

// Google authentication
authRouter.post(
  "/google",
  createRateLimiter("googleAuthRL", {
    maxAttemptsIP: 10,
    durationIP: 60 * 5,
    maxAttemptsUserIP: 5,
    durationUserIP: 60 * 5,
  }),
  validateRequestSchema({
    email: { required: true, type: "string" },
    name: { required: true, type: "string" },
  }),
  handleMiddlewareErrors,
  googleAuth,
);

// User signup
authRouter.post(
  "/signup",
  createRateLimiter("signupRL", {
    maxAttemptsIP: 10,
    durationIP: 60 * 5,
    maxAttemptsUserIP: 5,
    durationUserIP: 60 * 5,
  }),
  validateRequestSchema({
    email: { required: true, type: "string" },
    name: { required: true, type: "string" },
    password: { required: true, type: "string" },
  }),
  handleMiddlewareErrors,
  signup,
);

// User signin
authRouter.post(
  "/signin",
  createRateLimiter("signinRL", {
    maxAttemptsIP: 10,
    durationIP: 60 * 5,
    maxAttemptsUserIP: 5,
    durationUserIP: 60 * 5,
  }),
  validateRequestSchema({
    email: { required: true, type: "string" },
    password: { required: true, type: "string" },
  }),
  handleMiddlewareErrors,
  signin,
);

// Get current user info (authenticated)
authRouter.get(
  "/me",
  authenticateToken,
  createRateLimiter("getCurrentUserRL", {
    maxAttemptsIP: 100,
    durationIP: 60 * 10,
    maxAttemptsUserIP: 20,
    durationUserIP: 60,
  }),
  handleMiddlewareErrors,
  getCurrentUser,
);

// User signout
authRouter.post(
  "/signout",
  authenticateToken,
  createRateLimiter("signoutRL", {
    maxAttemptsIP: 100,
    durationIP: 60 * 10,
    maxAttemptsUserIP: 20,
    durationUserIP: 60,
  }),
  handleMiddlewareErrors,
  signout,
);

// Get token for authenticated user (for NextAuth integration)
authRouter.post(
  "/get-token",
  createRateLimiter("getTokenRL", {
    maxAttemptsIP: 50,
    durationIP: 60 * 10,
    maxAttemptsUserIP: 5,
    durationUserIP: 60,
  }),
  validateRequestSchema({
    email: { required: true, type: "string" },
  }),
  handleMiddlewareErrors,
  getToken,
);

// Validate token
authRouter.post(
  "/validate-token",
  authenticateToken,
  createRateLimiter("validateTokenRL", {
    maxAttemptsIP: 50,
    durationIP: 60 * 10,
    maxAttemptsUserIP: 5,
    durationUserIP: 60,
  }),
  handleMiddlewareErrors,
  validateToken,
);
