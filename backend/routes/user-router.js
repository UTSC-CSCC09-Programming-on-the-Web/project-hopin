import { Router } from "express";
import { prisma } from "../lib/prisma.js"; // import this for singleton prisma
import { authenticateToken } from "../middleware/auth.js";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path, { parse } from "path";
import express from "express";

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
      const userId = req.params.id;
      console.log(userId);
      if (!userId) {
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

        const { name, password } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (password) {
          const salt = bcrypt.genSaltSync(10);
          updateData.password = bcrypt.hashSync(password, salt);
        }
        let avatar = null;
        if (req.file) {
          avatar = `http://localhost:8080/${req.file.path}`;
          updateData.avatar = avatar;
        }

        if (Object.keys(updateData).length > 0) {
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
          console.log(updatedUser);
          const { password, ...safeUser } = updatedUser;
          return res.json(safeUser);
        } else {
          // If no updates were made, return the current user data
          // const currentUser = {
          //   id: user.id,
          //   name: user.name,
          //   email: user.email,
          //   avatar: user.avatar,
          //   location: user.location,
          //   destination: user.destination,
          //   isReady: user.isReady,
          //   createdAt: user.createdAt,
          //   updatedAt: user.updatedAt,
          // };
          const { password, ...safeUser } = user;
          return res.json(safeUser);
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

// Update user location or destination
userRouter.patch("/:id/position", async (req, res) => {
  try {
    const userId = req.params.id;
    const field = req.query.field;

    if (!userId || (field !== "location" && field !== "destination")) {
      return res.status(400).json({ error: "Invalid userId or field" });
    }

    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        [field]: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
      },
    });

    const { password, ...safeUser } = updatedUser;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error updating location: ", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// Update user ready status
userRouter.patch("/:id/isReady", async (req, res) => {
  try {
    const userId = req.params.id;
    const { isReady } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    if (isReady === null) {
      return res
        .status(400)
        .json({ error: "isReady takes either true or false" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isReady },
    });

    const { password, ...safeUser } = updatedUser;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error updating location: ", error);
    res.status(500).json({ error: "Failed to update location" });
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
