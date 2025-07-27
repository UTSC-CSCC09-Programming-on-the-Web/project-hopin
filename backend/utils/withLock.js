import redisClient from "../lib/redisClient.js";

// To lock smaller actions
export async function withLock(lockKey, expireAfter = 10, cb) {
  const acquired = await redisClient.set(lockKey, "1", "NX", "EX", expireAfter);
  if (!acquired) {
    throw new Error("LOCKED");
  }

  try {
    return await cb();
  } finally {
    await redisClient.del(lockKey);
  }
}
