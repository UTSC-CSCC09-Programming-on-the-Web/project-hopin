import redisClient from "../lib/redisClient.js";
import { RateLimiterRedis } from "rate-limiter-flexible";

const MAX_FAILS_PER_IP = 100;
const MAX_FAILS_PER_USER_IP = 10;

// Failed requests from an IP is rate limited to maxAttemptsIP per durationIP seconds
// and requests from a user at an ip is rate limited to maxAttemptsUserIP per durationUSserIP seconds
export function createRateLimiter(
  actionKeyPrefix,
  maxAttemptsIP = MAX_FAILS_PER_IP,
  durationIP = 60,
  maxAttemptsUserIP = MAX_FAILS_PER_USER_IP,
  durationUserIP = 5,
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

  return async (req, res, next) => {
    try {
      const ipKey = req.ip;
      const userIPKey = `${req.user?.id || "anon"}_${ipKey}`;

      const [resIP, resUserIP] = await Promise.all([
        limiterByIP.get(ipKey),
        limiterByUserIP.get(userIPKey),
      ]);

      console.log(
        `[Rate Limit Debug] IP limit result:`,
        resIP
          ? `${resIP.consumedPoints}/${maxAttemptsIP} points`
          : "No previous attempts",
      );
      console.log(
        `[Rate Limit Debug] UserIP limit result:`,
        resUserIP
          ? `${resUserIP.consumedPoints}/${maxAttemptsUserIP} points`
          : "No previous attempts",
      );

      let retrySecs = 0;
      // Check if IP or userId+IP is already blocked
      if (resIP && resIP.consumedPoints > maxAttemptsIP) {
        retrySecs = Math.round(resIP.msBeforeNext / 1000) || 1;
      } else if (
        resUserIP &&
        resUserIP.consumedPoints > maxAttemptsUserIP
      ) {
        retrySecs = Math.round(resUserIP.msBeforeNext / 1000) || 1;
      }

      if (retrySecs > 0) {
        console.log(
          `[Rate Limit] BLOCKED: ${actionKeyPrefix} - IP/UserIP exceeded limits, retry in ${retrySecs}s`,
        );
        const error = new Error("Rate limit exceeded");
        error.status = 429;
        error.retryAfter = retrySecs;
        throw error;
      } else {
        req.rlIPKey = ipKey;
        req.rlUserIPKey = userIPKey;
        req.limiterByIP = limiterByIP;
        req.limiterByUserIP = limiterByUserIP;
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
    if (!req.limiterByIP || !req.limiterByUserIP || !req.rlIPKey || !req.rlUserIPKey) {
      return;
    }

    const limiterByIP = req.limiterByIP;
    const limiterByUserIP = req.limiterByUserIP;
    const promises = [limiterByIP.consume(req.rlIPKey)];
    if (req.user?.id) {
      promises.push(limiterByUserIP.consume(req.rlUserIPKey));
    }
    await Promise.all(promises);
  } catch (rlRejected) {
    if (rlRejected instanceof Error) {
      throw rlRejected;
    }
    const retrySecs = Math.round(rlRejected.msBeforeNext / 1000) || 1;
    return retrySecs;
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
  if (!req.limiterByIP || !req.limiterByUserIP || !req.rlIPKey || !req.rlUserIPKey) {
    return;
  }

  console.log(
    `[Rate Limit Debug] Resetting failed attempts for IP: ${req.rlIPKey}, UserIP: ${req.rlUserIPKey}`,
  );
  const limiterByIP = req.limiterByIP;
  const limiterByUserIP = req.limiterByUserIP;
  await limiterByIP.delete(req.rlIPKey);
  await limiterByUserIP.delete(req.rlUserIPKey);
  console.log(`[Rate Limit Debug] Failed attempts reset successfully`);
}
