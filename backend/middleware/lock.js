import redisClient from "../lib/redis.js";

// To lock endpoints
export function createLock(keyPrefix, expireAfter = 10) {
  return async function lock(req, res, next) {
    let lockKey;
    try {
      const userId = req.user?.id;
      if (!userId) {
        const error = new Error("Authentication required");
        error.status = 401;
        throw error;
      }

      lockKey = `${keyPrefix}:${userId}`;
      const acquired = await redisClient.set(lockKey, "1", {
        NX: true,
        EX: expireAfter,
      });

      if (!acquired) {
        const error = new Error("LOCKED");
        error.status = 403;
        error.message =
          "Another request is already in progress for this user and action";
        throw error;
      }

      req.lockKey = lockKey;
      next();
    } catch (error) {
      console.error("Lock middleware error:", error);
      if (lockKey) {
        await redisClient.del(lockKey).catch(console.error);
      }
      next(error);
    }
  };
}

export async function releaseLock(lockKey) {
  try {
    await redisClient.del(lockKey);
  } catch (error) {
    console.error("Failed to release lock:", error);
  }
}
