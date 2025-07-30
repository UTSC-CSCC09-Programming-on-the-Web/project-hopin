import generateGroupId from "../utils/generateGroupId.js";
import { io } from "../lib/socket.js";
import { prisma, userSafeSelect } from "../lib/prisma.js";
import redisClient from "../lib/redis.js";
import { releaseLock } from "../middleware/lock.js";
import {
  checkRateLimit,
  consumeFailedAttempts,
  resetFailAttempts,
} from "../middleware/rate-limit.js";

/**
 * Helper function to verify group exists in both Redis and Database
 * Cleans up inconsistencies automatically
 */
const verifyGroupExists = async (groupId) => {
  const redisExists = await redisClient.SISMEMBER("groupIds", groupId);

  if (!redisExists) {
    return { exists: false, error: "Group not found" };
  }

  console.log("exists in redis", redisExists);

  const dbGroup = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { select: userSafeSelect },
      owner: { select: userSafeSelect },
      driver: { select: userSafeSelect },
    },
  });

  console.log("exists in db", dbGroup);

  if (!dbGroup) {
    // Group exists in Redis but not in DB - clean up Redis
    await redisClient.SREM("groupIds", groupId);
    return { exists: false, error: "Group not found" };
  }

  return { exists: true, group: dbGroup };
};

export const createGroup = async (req, res) => {
  const userId = req.user.id;
  const newGroupId = await generateGroupId();

  let redisUpdated = false;

  try {
    // Use a database transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.group.create({
        data: {
          id: newGroupId,
          ownerId: userId,
          members: {
            connect: { id: userId },
          },
        },
      });

      // Add the user to the group
      await tx.user.update({
        where: { id: userId },
        data: {
          groupId: newGroupId,
        },
      });

      return group;
    });

    // Add the group id to the redis set for quick access (outside transaction)
    await redisClient.SADD("groupIds", newGroupId);
    redisUpdated = true;

    // Include the group members, owner, and driver in the response
    const groupWithDetails = await prisma.group.findUnique({
      where: { id: newGroupId },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    // Notify the user via socket that they have created a new group
    const socketId = await redisClient.HGET("userSockets", userId);
    if (socketId) {
      io.to(socketId).emit("group_created", {
        groupId: newGroupId,
      });
    }
    await resetFailAttempts(req);
    res.status(201).json(groupWithDetails);
  } catch (error) {
    console.error("Error creating group:", error);
    await consumeFailedAttempts(req);
    // Rollback redis update if it was successful
    if (redisUpdated) {
      try {
        await redisClient.SREM("groupIds", newGroupId);
        console.log(`Cleaned up Redis entry for group ${newGroupId}`);
      } catch (redisError) {
        console.error(
          "Failed to remove group from Redis during cleanup:",
          redisError,
        );
      }
    }

    res.status(500).json({ error: "Internal server error" });
  } finally {
    await releaseLock(req.lockKey);
  }
};

export const joinGroup = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  if (!groupId) {
    if (await checkRateLimit(req, res)) return;
    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Verify group exists and get its current state
    const verification = await verifyGroupExists(groupId);
    if (!verification.exists) {
      if (await checkRateLimit(req, res)) return;

      return res.status(404).json({ error: verification.error });
    }

    const existingGroup = verification.group;

    // Check if user is already a member
    const isAlreadyMember = existingGroup.members.some(
      (member) => member.id === userId,
    );
    if (isAlreadyMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of this group" });
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update user's groupId
      await tx.user.update({
        where: { id: userId },
        data: { groupId },
      });

      // Add user to group members
      await tx.group.update({
        where: { id: groupId },
        data: {
          members: {
            connect: { id: userId },
          },
        },
      });
    });

    // Get updated group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    // Instruct client to join the socket room
    const socketId = await redisClient.HGET("userSockets", userId);
    if (socketId) {
      io.to(socketId).emit("join_group", { groupId });
    }
    await resetFailAttempts(req);
    res.status(200).json(group);
  } catch (error) {
    console.error("Error joining group:", error);
    await consumeFailedAttempts(req);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await releaseLock(req.lockKey);
  }
};

export const leaveGroup = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  if (!groupId) {
    if (await checkRateLimit(req, res)) return;

    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Verify group exists and get its current state
    const verification = await verifyGroupExists(groupId);
    if (!verification.exists) {
      if (await checkRateLimit(req, res)) return;

      return res.status(404).json({ error: verification.error });
    }

    const group = verification.group;

    // Check if the user is a member of the group
    const isMember = group.members.some((member) => member.id === userId);
    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    const isOwner = group.ownerId === userId;
    const isLastMember = group.members.length === 1;

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Remove user from group members
      await tx.group.update({
        where: { id: groupId },
        data: {
          members: {
            disconnect: { id: userId },
          },
        },
      });

      // Update user's groupId to null
      await tx.user.update({
        where: { id: userId },
        data: { groupId: null },
      });

      // If owner leaves or last member, delete the group
      if (isOwner || isLastMember) {
        await tx.group.delete({ where: { id: groupId } });
      }
    });

    // Handle post-transaction cleanup and notifications
    if (isOwner || isLastMember) {
      // Remove the group ID from Redis
      try {
        await redisClient.SREM("groupIds", groupId);
      } catch (redisError) {
        console.error("Failed to remove group from Redis:", redisError);
      }

      if (isOwner) {
        // Notify all members that the group has been deleted
        io.to(groupId).emit("group_deleted", {
          reason: "owner_left",
          message: "Group was deleted because the owner left",
        });
      } else {
        // Last member left - no one to notify
        console.log(`Group ${groupId} deleted as last member left`);
      }
    } else {
      // Notify remaining members that the user has left
      io.to(groupId).emit("member_left", {
        userId,
        username:
          group.members.find((m) => m.id === userId)?.name || "Unknown user",
      });
    }
    await resetFailAttempts(req);
    res.status(200).json({
      message: "Successfully left the group",
      groupDeleted: isOwner || isLastMember,
    });
  } catch (error) {
    await consumeFailedAttempts(req);
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await releaseLock(req.lockKey);
  }
};

export const getGroup = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  if (!groupId) {
    if (await checkRateLimit(req, res)) return;

    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Verify group exists and get its current state
    const verification = await verifyGroupExists(groupId);
    if (!verification.exists) {
      if (await checkRateLimit(req, res)) return;

      return res.status(404).json({ error: verification.error });
    }

    // Get full group details with safe user selections
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    // Check if the user is a member of the group
    const isMember = group.members.some((member) => member.id === userId);
    if (!isMember) {
      if (await checkRateLimit(req, res)) return;

      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }
    await resetFailAttempts(req);
    res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    await consumeFailedAttempts(req);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const becomeDriver = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  if (!groupId) {
    if (await checkRateLimit(req, res)) return;

    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Verify group exists and get its current state
    const verification = await verifyGroupExists(groupId);
    if (!verification.exists) {
      if (await checkRateLimit(req, res)) return;

      return res.status(404).json({ error: verification.error });
    }

    const group = verification.group;

    // Check if the user is a member of the group
    const isMember = group.members.some((member) => member.id === userId);
    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Get current group with driver info
    const groupWithDriver = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        driver: { select: userSafeSelect },
      },
    });

    // Check if the group already has a driver
    if (groupWithDriver.driver) {
      if (await checkRateLimit(req, res)) return;

      return res.status(400).json({
        error: "Group already has a driver",
        currentDriver: groupWithDriver.driver,
      });
    }

    // Update the group to set the driver
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        driver: { connect: { id: userId } },
      },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    // Emit a socket event to notify all members that the user has become the driver
    io.to(groupId).emit("driver_changed", {
      driver: updatedGroup.driver,
      message: `${updatedGroup.driver.name} is now the driver`,
    });
    await resetFailAttempts(req);
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error becoming driver:", error);
    await consumeFailedAttempts(req);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await releaseLock(req.lockKey);
  }
};

export const unbecomeDriver = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  if (!groupId) {
    console.log("Made it here in unbecomeDriver");
    if (await checkRateLimit(req, res)) return;

    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Verify group exists and get its current state
    const verification = await verifyGroupExists(groupId);
    if (!verification.exists) {
      if (await checkRateLimit(req, res)) return;

      return res.status(404).json({ error: verification.error });
    }

    const group = verification.group;

    // Check if the user is the driver of the group
    if (group.driver?.id !== userId) {
      return res
        .status(403)
        .json({ error: "You are not the driver of this group" });
    }

    // Update the group to remove the driver
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        driver: { disconnect: true },
      },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    // Emit a socket event to notify all members that the driver has changed
    io.to(groupId).emit("driver_changed", {
      driver: null,
      message: `${group.driver.name} is no longer the driver`,
    });
    await resetFailAttempts(req);
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error unbecoming driver:", error);
    await consumeFailedAttempts(req);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await releaseLock(req.lockKey);
  }
};
