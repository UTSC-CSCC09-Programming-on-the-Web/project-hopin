import { Router } from "express";
import { prisma, userSafeSelect } from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";
import express from "express";
import { io } from "../lib/socket.js";

export const userRouter = Router();

// Helper function to broadcast user updates to group members
const broadcastUserUpdate = async (userId, updateType = "update") => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...userSafeSelect, groupId: true },
    });

    if (user && user.groupId) {
      const { groupId, ...safeUser } = user;
      io.to(groupId).emit("userStatusUpdate", {
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

// Helper function to return safe user data
const getSafeUserData = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
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
    console.log(users);
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
        });

        // Broadcast update to group members
        await broadcastUserUpdate(user.id, "profileUpdate");
      } else {
        updatedUser = user;
      }

      const safeUser = getSafeUserData(updatedUser);
      return res.json(safeUser);
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

// Update user location or destination
userRouter.patch("/:id/position", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const field = req.query.field;

    // Validate field parameter
    if (field !== "location" && field !== "destination") {
      return res.status(400).json({
        error: "Invalid field parameter. Must be 'location' or 'destination'",
      });
    }

    // Find and authorize user (allow self-updates only for security)
    const user = await findAndAuthorizeUser(userId, req.user.id, true);

    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Both latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        error:
          "Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    // Update user position
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        [field]: {
          latitude: lat,
          longitude: lng,
        },
      },
    });

    // Broadcast position update to group members
    await broadcastUserUpdate(userId, `${field}Update`);

    const safeUser = getSafeUserData(updatedUser);
    return res.status(200).json(safeUser);
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

// Update user ready status
userRouter.patch("/:id/ready", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isReady } = req.body;

    // Find and authorize user (allow self-updates only for security)
    const user = await findAndAuthorizeUser(userId, req.user.id, true);

    // Validate isReady parameter
    if (typeof isReady !== "boolean") {
      return res.status(400).json({
        error: "isReady must be a boolean value (true or false)",
      });
    }

    // Update user ready status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isReady },
    });

    // Broadcast ready status update to group members
    await broadcastUserUpdate(userId, "readyStatusUpdate");

    const safeUser = getSafeUserData(updatedUser);
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error updating ready status:", error);

    if (error.message === "Invalid user ID format") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "You can only update your own profile") {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: "Failed to update ready status" });
  }
});

// Comprehensive user update endpoint - handles multiple fields in one request
userRouter.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find and authorize user
    const user = await findAndAuthorizeUser(userId, req.user.id, true);

    const { location, destination, isReady } = req.body;
    const updateData = {};
    let updateTypes = [];

    // Validate and prepare location update
    if (location !== undefined) {
      if (typeof location !== "object" || location === null) {
        return res.status(400).json({ error: "Location must be an object" });
      }

      const { latitude, longitude } = location;
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          error: "Location must include both latitude and longitude",
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          error: "Invalid location coordinates",
        });
      }

      updateData.location = { latitude: lat, longitude: lng };
      updateTypes.push("locationUpdate");
    }

    // Validate and prepare destination update
    if (destination !== undefined) {
      if (destination === null) {
        updateData.destination = null;
        updateTypes.push("destinationUpdate");
      } else if (typeof destination === "object") {
        const { latitude, longitude } = destination;
        if (latitude === undefined || longitude === undefined) {
          return res.status(400).json({
            error: "Destination must include both latitude and longitude",
          });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (
          isNaN(lat) ||
          isNaN(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          return res.status(400).json({
            error: "Invalid destination coordinates",
          });
        }

        updateData.destination = { latitude: lat, longitude: lng };
        updateTypes.push("destinationUpdate");
      } else {
        return res
          .status(400)
          .json({ error: "Destination must be an object or null" });
      }
    }

    // Validate and prepare ready status update
    if (isReady !== undefined) {
      if (typeof isReady !== "boolean") {
        return res.status(400).json({
          error: "isReady must be a boolean value",
        });
      }
      updateData.isReady = isReady;
      updateTypes.push("readyStatusUpdate");
    }

    // Check if there are any updates to make
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No valid update fields provided",
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Broadcast comprehensive status update to group members
    await broadcastUserUpdate(userId, "statusUpdate");

    const safeUser = getSafeUserData(updatedUser);
    return res.status(200).json({
      ...safeUser,
      updatedFields: updateTypes,
    });
  } catch (error) {
    console.error("Error updating user status:", error);

    if (error.message === "Invalid user ID format") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "You can only update your own profile") {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: "Failed to update user status" });
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
