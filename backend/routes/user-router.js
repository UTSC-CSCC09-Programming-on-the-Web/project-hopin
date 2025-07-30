import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { requireSubscription } from "../middleware/subscription-check.js";
import multer from "multer";
import path from "path";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { createLock } from "../middleware/lock.js";
import {
  checkContentType,
  validateRequestSchema,
} from "../middleware/validate-request-schema.js";
import { handleMiddlewareErrors } from "../middleware/error-handler.js";
import {
  deleteUser,
  getSubscriptionstatus,
  updatePostion,
  updateProfile,
  updateReadyStatus,
  getAllUsers,
  getUserByEmail,
  getUserById,
  updateUserComprehensive,
  getUserGroup,
} from "../controllers/user-controller.js";
import fs from "fs";

export const userRouter = Router();

// Make sure the uploads directory exists
const avatarDir = path.join(process.cwd(), "uploads/avatars");
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Serve avatar files from the uploads directory
// userRouter.use("/uploads/avatars", express.static(avatarDir));

// Get all users
userRouter.get(
  "/",
  authenticateToken, // Add authentication requirement
  requireSubscription, // Require active subscription
  createRateLimiter("getAllUsersRL", {
    maxAttemptsIP: 30, // 30 requests per 10 minutes from same IP
    durationIP: 60 * 10,
    maxAttemptsUserIP: 15, // 15 requests per 10 minutes per user
    durationUserIP: 60 * 10,
    enableProgressive: true,
  }),
  validateRequestSchema({
    querySchema: {
      take: { required: false, type: "number", coerce: true },
      cursor: { required: false, type: "string" },
      groupId: { required: false, type: "string" },
    },
  }),
  handleMiddlewareErrors,
  getAllUsers,
);

// Get user by email (authenticated only)
userRouter.get(
  "/by-email",
  authenticateToken,
  // requireSubscription, // Require active subscription
  createRateLimiter("getUserByEmailRL", {
    maxAttemptsIP: 20, // 20 requests per 10 minutes from same IP
    durationIP: 60 * 10,
    maxAttemptsUserIP: 8, // 8 requests per 10 minutes per user
    durationUserIP: 60 * 10,
    enableProgressive: true,
  }),
  validateRequestSchema({
    querySchema: {
      email: { required: true, type: "string" },
    },
  }),
  handleMiddlewareErrors,
  getUserByEmail,
);

// Get user by ID
userRouter.get(
  "/:id",
  authenticateToken, // Add authentication requirement
  // requireSubscription, // Require active subscription
  createRateLimiter("getUserByIdRL", {
    maxAttemptsIP: 100, // 100 requests per 10 minutes from same IP
    durationIP: 60 * 10,
    maxAttemptsUserIP: 30, // 30 requests per 5 minutes per user
    durationUserIP: 60 * 5,
  }),
  validateRequestSchema({
    paramsSchema: {
      id: { required: true, type: "string" },
    },
  }),
  handleMiddlewareErrors,
  getUserById,
);

// Update a user with optional avatar upload
userRouter.patch(
  "/:id",
  authenticateToken,
  upload.single("avatar"),
  createLock("updateProfileLock"),
  checkContentType("multipart/form-data"),
  validateRequestSchema({
    bodySchema: {
      name: { required: false, type: "string" },
      avatar: { required: false, type: "string" },
      // password: { required: false, type: "string" }, // Since we are not allowing in the frontend
    },
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  updateProfile,
);

userRouter.get(
  "/:id/subscription-status",
  authenticateToken,
  createRateLimiter("getSubscriptionStatusRL", {
    maxAttemptsIP: 100,
    durationIP: 60,
    maxAttemptsUserIP: 50,
  }),
  validateRequestSchema({
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  getSubscriptionstatus,
);

userRouter.patch(
  "/:id/position",
  authenticateToken,
  requireSubscription,
  createLock("updatePositionLock"),
  checkContentType("application/json"),
  validateRequestSchema({
    bodySchema: {
      longitude: { required: true, type: "number", coerce: true },
      latitude: { required: true, type: "number", coerce: true },
    },
    querySchema: { field: { required: true, type: "string" } },
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  updatePostion,
);

userRouter.patch(
  "/:id/isReady",
  authenticateToken,
  requireSubscription,
  createLock("updateReadyStatusRL"),
  checkContentType("application/json"),
  validateRequestSchema({
    bodySchema: { isReady: { required: true, type: "boolean", coerce: true } },
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  updateReadyStatus,
);

userRouter.delete(
  "/:id",
  authenticateToken,
  createRateLimiter("deleteUserRL"),
  createLock("deleteUserLock"),
  validateRequestSchema({
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  deleteUser,
);

userRouter.patch(
  "/:id/status",
  authenticateToken,
  createRateLimiter("updateUserComprehensiveRL"),
  createLock("updateUserComprehensiveLock"),
  handleMiddlewareErrors,
  updateUserComprehensive,
);

userRouter.get(
  "/me/group",
  authenticateToken,
  createRateLimiter("getSubscriptionStatusRL", {
    maxAttemptsIP: 100,
    durationIP: 60,
    maxAttemptsUserIP: 50,
  }),
  getUserGroup,
);
