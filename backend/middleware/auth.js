import jwt from "jsonwebtoken";
import redisClient from "../lib/redisClient.js";
import { verifyJWT } from "../utils/jwt.js";

// Redis-based token blacklist for production scalability
export const blacklistToken = {
  add: async (token) => {
    try {
      // Extract expiry from token to set TTL
      const decoded = jwt.decode(token);
      const exp = decoded?.exp;
      const jti = decoded?.jti;

      if (!jti) {
        console.log("Token has no jti, cannot blacklist");
        return;
      }

      const ttl = exp ? exp - Math.floor(Date.now() / 1000) : 24 * 60 * 60;
      if (ttl > 0) {
        await redisClient.set(`blacklist:jti:${jti}`, "1", { EX: ttl });
        console.log(`Token blacklisted with TTL ${ttl}s`);
      }
    } catch (error) {
      console.error("Error blacklisting token:", error);
    }
  },

  isBlacklisted: async (token) => {
    try {
      const decoded = jwt.decode(token);
      const jti = decoded?.jti;
      if (!jti) return false;

      const result = await redisClient.get(`blacklist:jti:${jti}`);
      return result !== null;
    } catch (error) {
      console.error("Error checking blacklist:", error);
      return false; // Fail open for availability
    }
  },
};

// use this function if the feature you're incorporating requires authentication
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    const error = new Error("Authentication required");
    error.status = 401;
    return next(error);
  }

  // Check if token is blacklisted
  try {
    const isBlacklisted = await blacklistToken.isBlacklisted(token);
    if (isBlacklisted) {
      const error = new Error("Token has been revoked");
      error.status = 401;
      return next(error);
    }
  } catch (error) {
    console.error("Error checking token blacklist:", error);
    // Continue with token verification if blacklist check fails
  }

  try {
    const user = await verifyJWT(token, false); // Verify as access token
    req.user = user;
    next();
  } catch (err) {
    const error = new Error("Invalid or expired token");
    error.status = 403;
    return next(error);
  }
}
