import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import redisClient from "../lib/redisClient.js";

const signJWT = async (userId, email, isRefresh = false) => {
  const jti = randomUUID();

  const payload = { 
    id: userId, 
    email, 
    type: isRefresh ? 'refresh' : 'access',
    jti,
  };
  
  const options = { 
    expiresIn: isRefresh ? "7d" : "1h"
  };
  
  const token = jwt.sign(payload, process.env.JWT_SECRET, options);
  
  const expireAfter = isRefresh ? 7 * 24 * 60 * 60: 60 * 60;
  await redisClient.set(`jti:${jti}`, "1", { EX: expireAfter });
  
  return token;
};

// Verify JWT token
const verifyJWT = async (token, isRefresh = false) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify token type matches expected
    if (decoded.type !== (isRefresh ? 'refresh' : 'access')) {
      throw new Error("Invalid token type");
    }

    const jtiExists = await redisClient.exists(`jti:${decoded.jti}`);
    if (!jtiExists) {
      throw new Error("Invalid or revoked token");
    }
    
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

const invalidateJWT = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti) {
      // Add to blacklist in Redis
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      await redisClient.set(`blacklist:jti:${decoded.jti}`, "1", { EX: ttl > 0 ? ttl : 1 });
    }
  } catch (error) {
    console.error("Error invalidating JWT:", error);
  }
}

export { signJWT, verifyJWT, invalidateJWT };
