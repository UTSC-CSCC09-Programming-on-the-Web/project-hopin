import { Router } from "express";
import { prisma, userSafeSelect } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";
import express from "express";
import { io } from "../lib/socket.js";
import { validateCoordinates } from "../utils/validateCoords.js";

export const userRouter = Router();

// Helper function to broadcast user updates to group members
const broadcastUserUpdate = async (userId, updateType) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...userSafeSelect, groupId: true },
    });

    if (user && user.groupId) {
      const { groupId, ...safeUser } = user;
      io.to(groupId).emit("member_updated", {
        user: safeUser,
        updateType,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error broadcasting user update:", error);
  }
};

// Helper function to validate and find user with authorization
const findAndAuthorizeUser = async (
  userId,
  requestingUserId,
  requireOwnership = true
) => {
  if (!userId) {
    throw new Error("Invalid user ID format");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (requireOwnership && user.id !== requestingUserId) {
    throw new Error("You can only update your own profile");
  }

  return user;
};

// Make sure the uploads directory exists
const avatarDir = "api/users/avatars";
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
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
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
userRouter.get("/", async (req, res) => {
  try {
    const { take = 10, cursor, groupId } = req.query;
    const parsedTake = parseInt(take);
    if (isNaN(parsedTake) || parsedTake < 1 || parsedTake > 100) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    let query = {
      take: parsedTake,
      orderBy: {
        createdAt: "desc",
      },
    };

    if (cursor) {
      query = {
        ...query,
        skip: 1,
        cursor: {
          id: cursor,
        },
      };
    }

    if (groupId) {
      query = {
        ...query,
        relationLoadStrategy: "join",
        include: {
          galleryId: true,
        },
      };
    }
    const users = await prisma.user.findMany(query);
    let nextCursor = null;
    if (users.length > take) {
      nextCursor = users[take - 1].id;
    }
    res.status(200).json({
      users,
      nextCursor,
    });
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
      where: { id: req.params.id },
      // exclude password from the response
      select: userSafeSelect,
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

// Update a user
userRouter.patch(
  "/:id",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Find and authorize user
      const user = await findAndAuthorizeUser(userId, req.user.id, true);

      const { name, password } = req.body;
      const updateData = {};

      // Validate and prepare update data
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return res
            .status(400)
            .json({ error: "Name must be a non-empty string" });
        }
        updateData.name = name.trim();
      }

      if (password !== undefined) {
        if (typeof password !== "string" || password.length < 6) {
          return res
            .status(400)
            .json({ error: "Password must be at least 6 characters long" });
        }
        const salt = bcrypt.genSaltSync(10);
        updateData.password = bcrypt.hashSync(password, salt);
      }

      // Handle avatar upload
      if (req.file) {
        const avatar = `http://localhost:8080/${req.file.path}`;
        updateData.avatar = avatar;
      }

      // Update user if there are changes
      let updatedUser;
      if (Object.keys(updateData).length > 0) {
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: userSafeSelect,
        });

        // Broadcast update to group members
        await broadcastUserUpdate(user.id, "profile");
      } else {
        updatedUser = user;
      }

      return res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);

      if (error.message === "Invalid user ID format") {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "You can only update your own profile") {
        return res.status(403).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Update user location
userRouter.patch("/:id/location", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find and authorize user (allow self-updates only for security)
    await findAndAuthorizeUser(userId, req.user.id, true);

    const coordsValid = validateCoordinates(req.body);
    if (!coordsValid.valid) {
      return res.status(400).json({
        error: coordsValid.error,
      });
    }

    // Update user position
    await prisma.user.update({
      where: { id: userId },
      data: {
        location: {
          latitude: req.body.latitude,
          longitude: req.body.longitude,
        },
      },
    });

    // Broadcast position update to group members
    await broadcastUserUpdate(userId, "location");

    return res.status(204).end();
  } catch (error) {
    console.error(`Error updating ${req.query.field}:`, error);

    if (error.message === "Invalid user ID format") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "You can only update your own profile") {
      return res.status(403).json({ error: error.message });
    }

    res
      .status(500)
      .json({ error: `Failed to update ${req.query.field || "position"}` });
  }
});

// Update user destination
userRouter.patch("/:id/destination", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    // Find and authorize user (allow self-updates only for security)
    await findAndAuthorizeUser(userId, req.user.id, true);
    const { name, address, location } = req.body;

    // Validate destination data
    if (!name || !address || !location) {
      return res.status(400).json({
        error: "Name, address, and location are required",
      });
    }
    const coordsValid = validateCoordinates(location);
    if (!coordsValid.valid) {
      return res.status(400).json({
        error: coordsValid.error,
      });
    }

    // Update user destination
    await prisma.$transaction(async (tx) => {
      const place = await tx.place.create({
        data: {
          name,
          address,
          location,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          destination: {
            connect: { id: place.id },
          },
        },
      });
    });

    // Broadcast destination update to group members
    await broadcastUserUpdate(userId, "destination");

    return res.status(204).end();
  } catch (error) {
    console.error("Error updating user destination:", error);

    if (error.message === "Invalid user ID format") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "You can only update your own profile") {
      return res.status(403).json({ error: error.message });
    }

    return res.status(500).json({ error: "Failed to update user destination" });
  }
});

// Delete a user
userRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const deleteUser = await prisma.user.findUnique({
      where: { id: req.params.id },
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

// Get the current user's group
// This endpoint returns the group details for the authenticated user
userRouter.get("/me/group", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { groupId: true },
    });

    if (!user?.groupId) {
      return res.status(404).json({ error: "User is not in a group" });
    }

    const group = await prisma.group.findUnique({
      where: { id: user.groupId },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching user's group:", error);
    res.status(500).json({ error: "Failed to fetch user's group" });
  }
});
