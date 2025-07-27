import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import express from "express";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { createLock } from "../middleware/lock.js";
import { checkContentType, validateRequestPayload } from "../middleware/validate-request-payload.js";
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
} from "../controllers/user-controller.js";

export const userRouter = Router();

// Make sure the uploads directory exists
const avatarDir = "api/users/avatars";
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Configure multer with a storage strategy
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
userRouter.use("/avatars", express.static(avatarDir));

// Get all users
userRouter.get(
  "/",
  createRateLimiter("getAllUsersRL"),
  validateRequestPayload({
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
  createRateLimiter("getUserByEmailRL"),
  validateRequestPayload({
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
  createRateLimiter("getUserByIdRL"),
  validateRequestPayload({
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
  validateRequestPayload({
    bodySchema: {
      name: { required: false, type: "string" },
      password: { required: false, type: "string" },
    },
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  updateProfile,
);

userRouter.get(
  "/:id/subscription-status",
  authenticateToken,
  createRateLimiter("getSubscriptionStatusRL", 100, 60, 50),
  validateRequestPayload({
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  getSubscriptionstatus,
);

userRouter.patch(
  "/:id/position",
  authenticateToken,
  createLock("updatePositionLock"),
  checkContentType("application/json"),
  validateRequestPayload({
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
  createLock("updateReadyStatusRL"),
  checkContentType("application/json"),
  validateRequestPayload({
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
  validateRequestPayload({
    paramsSchema: { id: { required: true, type: "string" } },
  }),
  handleMiddlewareErrors,
  deleteUser,
);
