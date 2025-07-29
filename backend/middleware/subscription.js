import { prisma } from "../lib/prisma.js";
import {
  checkRateLimit,
  consumeFailedAttempts,
  resetFailAttempts,
} from "./rate-limit.js";

/**
 * Middleware to enforce subscription requirements for protected routes
 * This middleware should be used after authenticateToken middleware
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      const error = new Error("Authentication required");
      error.status = 401;
      return next(error);
    }

    // Get user subscription status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          select: {
            status: true,
            subscriptionId: true,
            customerId: true,
          },
        },
      },
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const subscription = user.subscription;
    const subscriptionStatus = subscription?.status || "inactive";

    // Allow access only for active subscriptions
    if (subscriptionStatus !== "active") {
      await consumeFailedAttempts(req);

      // Determine appropriate error message based on subscription status
      let errorMessage = "Active subscription required";
      let errorCode = "SUBSCRIPTION_REQUIRED";

      switch (subscriptionStatus) {
        case "cancelled":
          errorMessage =
            "Your subscription has been cancelled. Please renew to continue.";
          errorCode = "SUBSCRIPTION_CANCELLED";
          break;
        case "past_due":
          errorMessage =
            "Your subscription payment is past due. Please update your payment method.";
          errorCode = "SUBSCRIPTION_PAST_DUE";
          break;
        case "unpaid":
          errorMessage =
            "Your subscription payment failed. Please update your payment method.";
          errorCode = "SUBSCRIPTION_UNPAID";
          break;
        case "incomplete":
          errorMessage =
            "Your subscription setup is incomplete. Please complete the payment process.";
          errorCode = "SUBSCRIPTION_INCOMPLETE";
          break;
        case "inactive":
        default:
          errorMessage =
            "No active subscription found. Please subscribe to access this feature.";
          errorCode = "SUBSCRIPTION_INACTIVE";
          break;
      }

      return res.status(402).json({
        error: errorMessage,
        code: errorCode,
        subscriptionStatus,
        redirectUrl: "/account/subscribe",
      });
    }

    // Reset rate limiting for successful subscription check
    await resetFailAttempts(req);

    // Attach subscription info to request for downstream middleware
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

/**
 * Middleware to check subscription status without blocking access
 * Useful for optional subscription features
 */
export async function checkSubscriptionStatus(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      req.subscription = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          select: {
            status: true,
            subscriptionId: true,
            customerId: true,
          },
        },
      },
    });

    req.subscription = user?.subscription || null;
    req.subscriptionStatus = user?.subscription?.status || "inactive";

    next();
  } catch (error) {
    console.error("Subscription status check error:", error);
    // Don't block request if subscription check fails
    req.subscription = null;
    req.subscriptionStatus = "unknown";
    next();
  }
}
