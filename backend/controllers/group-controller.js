import generateGroupId from "../utils/generateGroupId.js";
import { io } from "../lib/socket.js";
import { prisma, userSafeSelect } from "../lib/prisma.js";
import redisClient from "../lib/redis.js";

export const createGroup = async (req, res) => {
  const userId = req.user.id;
  const newGroupId = await generateGroupId();

  try {
    const group = await prisma.group.create({
      data: {
        id: newGroupId,
        ownerId: userId,
        members: {
          connect: { id: userId },
        },
      },
    });

    // Add the user to the group
    await prisma.user.update({
      where: { id: userId },
      data: {
        groupId: newGroupId,
      },
    });

    // Emit a socket event to notify the user that they have created the group
    const socketId = await redisClient.hget("userSockets", userId);
    if (socketId) {
      io.to(socketId).emit("createdGroup", {
        groupId: newGroupId,
      });
    }

    // Add the group id to the redis set for quick access
    await redisClient.sadd("groupIds", newGroupId);

    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const joinGroup = async (req, res) => {
  const { id: groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Check group existence in Redis
    const groupExists = await redisClient.sismember("groupIds", groupId);
    if (!groupExists) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Update user and group in parallel
    await Promise.all([
      prisma.user.update({
        where: { id: req.user.id },
        data: { groupId },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: {
          members: {
            connect: { id: req.user.id },
          },
        },
      }),
    ]);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    // Instruct client to join room
    const socketId = await redisClient.hget("userSockets", req.user.id);
    if (socketId) {
      io.to(socketId).emit("joinGroup", { groupId });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  // Check if the group exists
  const groupExists = await redisClient.sismember("groupIds", groupId);
  if (!groupExists) {
    return res.status(404).json({ error: "Group not found" });
  }

  // Check if the user is a member of the group
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group || !group.members.some((member) => member.id === userId)) {
    return res
      .status(403)
      .json({ error: "You are not a member of this group" });
  }

  try {
    await Promise.all([
      // Remove user from group
      prisma.group.update({
        where: { id: groupId },
        data: {
          members: {
            disconnect: { id: userId },
          },
        },
      }),
      // Update user's groupId to null
      prisma.user.update({
        where: { id: userId },
        data: { groupId: null },
      }),
    ]);

    const isOwner = group.ownerId === userId;
    const lastMember = group.members.length === 1;
    // If the user was the owner or the last member, delete the group
    if (isOwner || lastMember) {
      await prisma.group.delete({ where: { id: groupId } });
      if (isOwner) {
        // Notify all members that the group has been deleted
        io.to(groupId).emit("groupDeleted", {
          groupId,
        });
      }
      // Remove the group ID from Redis
      await redisClient.srem("groupIds", groupId);
    } else {
      // Notify remaining members that the user has left
      io.to(groupId).emit("memberLeft", {
        userId,
        groupId,
      });
    }

    // Emit a socket event to notify the user that they have left the group
    const socketId = await redisClient.hget("userSockets", userId);
    if (socketId) {
      io.to(socketId).emit("leftGroup", { groupId });
    }

    res.status(200).json({ message: "Successfully left the group" });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroup = async (req, res) => {
  const { id: groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Check group existence in Redis
    const groupExists = await redisClient.sismember("groupIds", groupId);
    if (!groupExists) {
      return res.status(404).json({ error: "Group not found" });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: userSafeSelect },
        owner: { select: userSafeSelect },
        driver: { select: userSafeSelect },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is a member of the group
    const isMember = group.members.some((member) => member.id === req.user.id);
    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const becomeDriver = async (req, res) => {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required." });
  }

  try {
    // Check group existence in Redis
    const groupExists = await redisClient.sismember("groupIds", groupId);
    if (!groupExists) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if the user is a member of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group || !group.members.some((member) => member.id === userId)) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Check if the group already has a driver
    if (group.driver) {
      return res.status(400).json({ error: "Group already has a driver" });
    }

    // Update the group to set the driver
    await prisma.group.update({
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
    io.to(groupId).emit("driverChanged", {
      groupId,
      driver: userId,
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("Error becoming driver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
