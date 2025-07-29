import { checkRateLimit, consumeFailedAttempts } from "./rate-limit.js";

export async function handleMiddlewareErrors(error, req, res, next) {
  if (error.status === 401) {
    if (await checkRateLimit(req, res)) return;
    return res
      .status(401)
      .json({ error: error.message || "Authentication required" });
  }
  if (error.status === 403) {
    if (await checkRateLimit(req, res)) return;
    if (error.message === "LOCKED") {
      return res.status(403).json({
        error:
          "Another request is already in progress for this user and action",
      });
    }
    return res.status(403).json({ error: error.message || "Forbidden" });
  }
  if (error.status === 429) {
    res.set("Retry-After", String(error.retryAfter || 60));
    return res.status(429).json({ error: "Too many requests" });
  }
  if (error.status === 400) {
    if (await checkRateLimit(req, res)) return;
    return res.status(400).json({ error: error.message || "Bad request" });
  }
  next(error);
}
