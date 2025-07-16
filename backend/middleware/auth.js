import jwt from "jsonwebtoken";

// Simple in-memory token blacklist (in production, use Redis or database)
const blacklistedTokens = new Set();

// Export function to add tokens to blacklist (used by auth-router)
export const blacklistToken = {
  add: (token) => {
    blacklistedTokens.add(token);
  },

  isBlacklisted: (token) => {
    return blacklistedTokens.has(token);
  },

  cleanup: () => {
    blacklistedTokens.clear();
  }
};

// use this function if the feature you're incorporating requires authentication
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.sendStatus(401);

  // Check if token is blacklisted
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ error: "Token has been revoked" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

setInterval(() => {
  tokenBlacklist.cleanup();

}, 60 * 60 * 1000)