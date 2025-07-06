import redisClient from "../lib/redis.js";

// Generates a unique group ID of the form "LLL-NNN" where L is a letter and N is a number
// Example: "ABC-123"
const generateGroupId = async () => {
  // Keep generating a new group ID until we find one that doesn't already exist
  while (true) {
    newGroupId = generateGroupId();
    // Check if the group ID already exists in Redis
    const existingGroup = await redisClient.sismember("groupIds", newGroupId);

    if (!existingGroup) {
      break; // Found a unique group ID
    }
  }

  return `${Math.random().toString(36).substring(2, 5)}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0")}`;
};

export default generateGroupId;
