import { createClient } from "redis";

const redisClient = createClient({
  url: `redis://default:${process.env.REDIS_PWD}@cache:${process.env.REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("end", () => console.error("Redis connection ended"));

(async () => {
  try {
    await redisClient.connect();
    console.log("Redis client connected and ready");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
})();

export default redisClient;
