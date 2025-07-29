import redisClient from "../lib/redis.js";
import { RateLimiterRedis } from "rate-limiter-flexible";

// baseDelay, maxDelay in seconds, return delay in seconds
export function calculateExponentialBackoff(
  attempts,
  baseDelay = 60,
  maxDelay = 3600,
) {
  const delay = Math.min(
    baseDelay * Math.pow(2, Math.max(attempts - 1, 0)),
    maxDelay,
  );
  const jitter = Math.random() * 0.1 * delay; // Add jitter
  return Math.floor(delay + jitter);
}
// Failed requests from an IP is rate limited to maxAttemptsIP per durationIP seconds
// and requests from a user at an ip is rate limited to maxAttemptsUserIP per durationUSserIP seconds
export function createRateLimiter(
  actionKeyPrefix,
  {
    maxAttemptsIP = 20,
    durationIP = 60,
    maxAttemptsUserIP = 5,
    durationUserIP = 5 * 60,
    enableProgressive = false,
  } = {},
) {
  // Limit by IP
  const limiterByIP = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: `${actionKeyPrefix}-ip`,
    points: maxAttemptsIP,
    duration: durationIP,
    blockDuration: 60 * 60, // Block for 1 hour, if points exceed maximum fail attempts
  });

  // Limit by userId + IP
  const limiterByUserIP = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: `${actionKeyPrefix}-user-ip`,
    points: maxAttemptsUserIP,
    duration: durationUserIP,
    blockDuration: 60 * 60,
  });

  const progressiveBlocker = enableProgressive
    ? new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: `${actionKeyPrefix}-progressive`,
        points: 1,
        duration: 60 * 60 * 12, // 12 hours for faster reset
        blockDuration: 60 * 60 * 12, // 12 hours progressive block
      })
    : null;

  return async (req, res, next) => {
    try {
      const ipKey = req.ip;
      const userIPKey = `${req.user?.id || req.body?.email || "anon"}_${ipKey}`;
      const progressiveKey = enableProgressive ? userIPKey : null;

      const [resIP, resUserIP, resProgressive] = await Promise.all([
        limiterByIP.get(ipKey),
        limiterByUserIP.get(userIPKey),
        progressiveBlocker ? progressiveBlocker.get(progressiveKey) : null,
      ]);

      let retrySecs = 0;
      const progressiveDelay = enableProgressive
        ? calculateExponentialBackoff(resProgressive?.consumedPoints || 0)
        : 0;

      // Check if IP or userId+IP is already blocked
      if (resIP && resIP.consumedPoints > maxAttemptsIP) {
        retrySecs = Math.max(
          Math.round(resIP.msBeforeNext / 1000) || 1,
          progressiveDelay,
        );
      } else if (resUserIP && resUserIP.consumedPoints > maxAttemptsUserIP) {
        retrySecs = Math.max(
          Math.round(resUserIP.msBeforeNext / 1000) || 1,
          progressiveDelay,
        );
      }

      if (retrySecs > 0) {
        console.log(
          `[Rate Limit] BLOCKED: ${actionKeyPrefix} - IP/UserIP exceeded limits, retry in ${retrySecs}s (progressive: ${progressiveDelay}s)`,
        );
        const error = new Error("Rate limit exceeded");
        error.status = 429;
        error.retryAfter = retrySecs;
        throw error;
      } else {
        req.rlIPKey = ipKey;
        req.rlUserIPKey = userIPKey;
        req.rlProgressiveKey = progressiveKey;
        req.limiterByIP = limiterByIP;
        req.limiterByUserIP = limiterByUserIP;
        req.progressiveBlocker = progressiveBlocker;
        return next();
      }
    } catch (error) {
      console.error("Rate limiter error:", error);
      next(error);
    }
  };
}

export async function consumeFailedAttempts(req) {
  try {
    if (!req.limiterByIP || !req.rlIPKey) return;
    const consume = [req.limiterByIP.consume(req.rlIPKey)];

    if (req.limiterByUserIP && req.rlUserIPKey)
      consume.push(req.limiterByUserIP.consume(req.rlUserIPKey));
    if (req.progressiveBlocker && req.rlProgressiveKey)
      consume.push(req.progressiveBlocker.consume(req.rlProgressiveKey));

    await Promise.all(consume);
  } catch (error) {
    if (error?.msBeforeNext) return Math.round(error.msBeforeNext / 1000) || 1;
    throw error;
  }
}

export async function checkRateLimit(req, res) {
  const retrySecs = await consumeFailedAttempts(req);
  if (retrySecs) {
    res.setHeader("Retry-After", retrySecs);
    res.status(429).json({ error: "Too many requests. Try again later." });
    return true;
  }
  return false;
}

export async function resetFailAttempts(req) {
  if (!req.limiterByIP || !req.rlIPKey) return;
  const reset = [
    req.limiterByIP.delete(req.rlIPKey),
    req.limiterByUserIP.delete(req.rlUserIPKey),
  ];

  if (req.progressiveBlocker && req.rlProgressiveKey) {
    reset.push(req.progressiveBlocker.delete(req.rlProgressiveKey));
  }

  await Promise.all(reset);
}
