import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";
import {
  consumeFailedAttempts,
  checkRateLimit,
  resetFailAttempts,
} from "../middleware/rate-limit.js";
import { releaseLock } from "../middleware/lock.js";
import bcrypt from "bcrypt";

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
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    await resetFailAttempts(req);
    const { password, ...safeUser } = user;
    return res.json(safeUser);
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
    if (!userId) {
      if (await checkRateLimit(req, res)) return;
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      // Ensure the user can only update their own profile
      if (user.id !== req.user.id) {
        if (await checkRateLimit(req, res)) return;
        return res
          .status(403)
          .json({ error: "You can only update your own profile" });
      }

      const { name } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      // Commented out since we don't have password changing feature in the frontend
      // if (password) {
      //   const salt = bcrypt.genSaltSync(10);
      //   updateData.password = bcrypt.hashSync(password, salt);
      // }
      let avatar = null;
      if (req.file) {
        // Construct the avatar URL using the filename, not the full path
        avatar = `http://localhost:8080/uploads/avatars/${req.file.filename}`;
        updateData.avatar = avatar;
      }

      if (Object.keys(updateData).length > 0) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        await resetFailAttempts(req);
        const { password, ...safeUser } = updatedUser;
        return res.json(safeUser);
      } else {
        await resetFailAttempts(req);
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      }
    } else {
      await consumeFailedAttempts(req, next);
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    await consumeFailedAttempts(req, next);
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
    if (!userId || (field !== "location" && field !== "destination")) {
      if (await checkRateLimit(req, res)) return;
      return res.status(400).json({ error: "Invalid userId or field" });
    }

    if (userId !== req.user?.id) {
      if (await checkRateLimit(req, res)) return;
      return res.status(403).json({ error: "Unauthorized to update account" });
    }

    const { latitude, longitude } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
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

    await resetFailAttempts(req);
    const { password, ...safeUser } = updatedUser;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error updating location: ", error);
    await consumeFailedAttempts(req, next);
    res.status(500).json({ error: "Failed to update location" });
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Update user ready status
export async function updateReadyStatus(req, res, next) {
  try {
    const userId = req.params.id;
    const { isReady } = req.body; // should have been validated by middleware

    if (!userId || userId !== req.user?.id) {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(403)
        .json({ error: "No userId passed or unauthorized to update account" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isReady },
    });

    await resetFailAttempts(req);
    const { password, ...safeUser } = updatedUser;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error updating ready status: ", error);
    await consumeFailedAttempts(req, next);
    res.status(500).json({ error: "Failed to update ready status" });
  } finally {
    await releaseLock(req.lockKey);
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
