import { createClient } from "redis";

const redisClient = createClient({
  url: `redis://default:${process.env.REDIS_PWD}@cache:${process.env.REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("Redis error:", err));

(async () => {
  await redisClient.connect();
})();

export default redisClient;
