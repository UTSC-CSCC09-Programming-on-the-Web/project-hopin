import { createClient } from "redis";

const redisClient = createClient({
  url: `redis://default:${process.env.REDIS_PWD}@cache:${process.env.REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("end", () => console.error("Redis connection ended"));

(async () => {
  await redisClient.connect();
  console.log("Redis client connected and ready");
})();

export default redisClient;
