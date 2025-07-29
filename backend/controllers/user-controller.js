import { prisma, userSafeSelect } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";
import {
  consumeFailedAttempts,
  checkRateLimit,
  resetFailAttempts,
} from "../middleware/rate-limit.js";
import { io } from "../lib/socket.js";
import { releaseLock } from "../middleware/lock.js";

// Helper function to broadcast user updates to group members
const broadcastUserUpdate = async (userId, updateType = "update") => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...userSafeSelect, groupId: true },
    });

    if (user && user.groupId) {
      const { groupId, ...safeUser } = user;
      io.to(groupId).emit("user_status_update", {
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
  requireOwnership = true,
) => {
  if (!userId) {
    if (await checkRateLimit(req, res)) return;
    throw new Error("Invalid user ID format");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    if (await checkRateLimit(req, res)) return;
    throw new Error("User not found");
  }

  if (requireOwnership && user.id !== requestingUserId) {
    if (await checkRateLimit(req, res)) return;
    throw new Error("You can only update your own profile");
  }

  return user;
};

// Helper function to return safe user data
const getSafeUserData = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

// Get all users
export async function getAllUsers(req, res, next) {
  try {
    const { take = "10", cursor, groupId } = req.query;
    const parsedTake = parseInt(take);
    if (isNaN(parsedTake) || parsedTake < 1 || parsedTake > 100) {
      await consumeFailedAttempts(req, next);
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    let query = {
      take: parsedTake,
      orderBy: {
        createdAt: "desc",
      },
    };

    if (cursor) {
      // validate cursor exists
      const cursorExists = await prisma.user.findUnique({
        where: { id: cursor },
        select: { id: true },
      });

      if (!cursorExists) {
        if (await checkRateLimit(req, res)) return;
        return res.status(400).json({ error: "Invalid cursor" });
      }

      query.skip = 1; // Skip the cursor record itself
      query.cursor = {
        id: cursor,
      };
    }

    // Add group filtering if provided
    if (groupId) {
      query.relationLoadStrategy = "join";
      query.include = {
        group: true,
      };
    }

    const users = await prisma.user.findMany(query);

    // Calculate next cursor
    let nextCursor = null;
    if (users.length === parsedTake) {
      nextCursor = users[parsedTake - 1].id;
    }

    await resetFailAttempts(req);
    res.status(200).json({
      users,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    await consumeFailedAttempts(req, next);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// Get user by email (authenticated only)
export async function getUserByEmail(req, res, next) {
  try {
    const { email } = req.query;

    if (typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await consumeFailedAttempts(req, next);
      return res.status(404).json({ error: "User not found" });
    }

    await resetFailAttempts(req);
    const { password, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    console.error("Error fetching user by email:", err);
    await consumeFailedAttempts(req, next);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get user by ID
export async function getUserById(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      // exclude password from the response
      select: userSafeSelect,
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    await resetFailAttempts(req);
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    await consumeFailedAttempts(req, next);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

// Get subscription status of a user
export async function getSubscriptionstatus(req, res, next) {
  try {
    const userId = req.params.id;
    if (!userId || userId !== req.user?.id) {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(403)
        .json({ error: "No userId passed or unauthorized to update account" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { select: { status: true } } },
    });
    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    await resetFailAttempts(req);
    return res.status(200).json({
      subscriptionStatus: user.subscription?.status || "inactive",
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    await consumeFailedAttempts(req, next);
    return res.status(500).json({ error: "Failed to get subscription status" });
  }
}

// Update a user with optional avatar upload
export async function updateProfile(req, res, next) {
  try {
    const userId = req.params.id;
    // Find and authorize user
    const user = await findAndAuthorizeUser(userId, req.user.id, true);

    if (user) {
      const { name } = req.body;
      const updateData = {};
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          if (await checkRateLimit(req, res)) return;
          return res
            .status(400)
            .json({ error: "Name must be a non-empty string" });
        }
        updateData.name = name.trim();
      }
      // Commented out since we don't have password changing feature in the frontend
      // if (password !== undefined) {
      //   if (typeof password !== "string" || password.length < 6) {
      //     return res
      //       .status(400)
      //       .json({ error: "Password must be at least 6 characters long" });
      //   }
      //   const salt = bcrypt.genSaltSync(10);
      //   updateData.password = bcrypt.hashSync(password, salt);
      // }
      if (req.file) {
        // Construct the avatar URL using the filename, not the full path
        const avatar = `http://localhost:8080/uploads/avatars/${req.file.filename}`;
        updateData.avatar = avatar;
      }

      let updatedUser;
      if (Object.keys(updateData).length > 0) {
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        await resetFailAttempts(req);
        await broadcastUserUpdate(user.id, "profileUpdate");
      } else {
        await resetFailAttempts(req);
        updatedUser = user;
      }
      const safeUser = getSafeUserData(updatedUser);
      return res.json(safeUser);
    } else {
      await consumeFailedAttempts(req, next);
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    await consumeFailedAttempts(req, next);
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
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Update user location or destination
export async function updatePostion(req, res, next) {
  try {
    const userId = req.params.id;
    const field = req.query.field;
    if (field !== "location" && field !== "destination") {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(400)
        .json({
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
    await resetFailAttempts(req);
    const safeUser = getSafeUserData(updatedUser);
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error(`Error updating ${req.query.field}:`, error);
    await consumeFailedAttempts(req);
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
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Update user ready status
export async function updateReadyStatus(req, res, next) {
  try {
    const userId = req.params.id;
    const { isReady } = req.body; // should have been validated by middleware

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

    await resetFailAttempts(req);
    // Broadcast ready status update to group members
    await broadcastUserUpdate(userId, "readyStatusUpdate");

    const safeUser = getSafeUserData(updatedUser);
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error updating ready status: ", error);
    await consumeFailedAttempts(req, next);
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
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Comprehensive user update endpoint - handles multiple fields in one request
export async function updateUserComprehensive(req, res) {
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
}

// Delete a user
export async function deleteUser(req, res, next) {
  try {
    const userId = req.params.id;
    if (!userId || userId !== req.user?.id) {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(403)
        .json({ error: "No userId passed or unauthorized to delete account" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    // delete user from stripe too if they have a subscription
    if (user.subscription?.customerId) {
      await stripe.customers.del(user.subscription.customerId);
    }

    // delete from db (subscription will be deleted via cascade)
    await prisma.user.delete({ where: { id: userId } });

    await resetFailAttempts(req);
    return res.status(204).end();
  } catch (error) {
    console.error("Error deleting user:", error);
    await consumeFailedAttempts(req, next);
    return res.status(500).json({ error: "Failed to delete user" });
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Get the current user's group
// This endpoint returns the group details for the authenticated user
export async function getUserGroup(req, res) {
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
}
