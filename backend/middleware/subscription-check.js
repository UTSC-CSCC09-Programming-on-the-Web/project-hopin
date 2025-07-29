import {
  checkRateLimit,
  consumeFailedAttempts,
  resetFailAttempts,
} from "./rate-limit.js";

export async function requireSubscription(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error("Authentication required");
      error.status = 401;
      return next(error);
    }

    // get user subscription status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscription;
    const subscriptionStatus = subscription?.status || "inactive";

    if (subscriptionStatus !== "active") {
      await consumeFailedAttempts(req);
      return res.status(402).json({
        error: "Active subscription required",
        subscriptionStatus,
        redirectUrl: "/accout/subscribe",
      });
    }

    await resetFailAttempts(req);
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    await consumeFailedAttempts(req);
    const err = new Error("Failed to verify subscription status");
    err.status = 500;
    return next(err);
  }
}
