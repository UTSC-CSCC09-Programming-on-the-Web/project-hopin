import { Router } from "express";
import { prisma } from "../lib/prisma.js"; // import this for singleton prisma
import { authenticateToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";
import express from "express";

export const userRouter = Router();

// Make sure the uploads directory exists
const avatarDir = "uploads/avatars";
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
userRouter.get("/", authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user by email (authenticated only)
userRouter.get("/by-email", authenticateToken, async (req, res) => {
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

// Get user by ID
userRouter.get("/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update a user with optional avatar upload
userRouter.patch(
  "/:id",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID format" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        // Ensure the user can only update their own profile
        if (user.id !== req.user.id) {
          return res
            .status(403)
            .json({ error: "You can only update your own profile" });
        }

        const { name, password, avatar, homeAddr } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (password) {
          const salt = bcrypt.genSaltSync(10);
          updateData.password = bcrypt.hashSync(password, salt);
        }
        if (homeAddr) updateData.homeAddr = homeAddr;

        // Copilot (line 230-240)
        // Prompt: "When isEditing=true (on frontend/src/app/profile/page.tsx), I want the image area to be clickable to upload a new file"
        if (req.file) {
          const avatarUrl = `http://localhost:8080/api/users/avatars/${req.file.filename}`;
          updateData.avatar = avatarUrl;
        } else if (avatar && typeof avatar === "string" && avatar.trim()) {
          console.log("Using avatar URL from form:", avatar);
          // Only update if it's a valid URL or path
          if (avatar.startsWith("/") || avatar.startsWith("http")) {
            updateData.avatar = avatar;
          }
        }

        if (Object.keys(updateData).length > 0) {
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              homeAddr: true,
            },
          });

          return res.json(updatedUser);
        } else {
          // If no updates were made, return the current user data
          const currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            homeAddr: user.homeAddr,
          };
          return res.json(currentUser);
        }
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  },
);

// Delete a user
userRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const deleteUser = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (deleteUser) {
      if (deleteUser.id !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You can only delete your own account" });
      }
      await prisma.user.delete({
        where: { id: deleteUser.id },
      });
      return res.status(204).end();
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});
