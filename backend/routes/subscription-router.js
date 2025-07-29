import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { requireSubscription } from "../middleware/subscription-check.js";
import { createLock } from "../middleware/lock.js";
import { handleMiddlewareErrors } from "../middleware/error-handler.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import {
  checkContentType,
  validateRequestSchema,
} from "../middleware/validate-request-schema.js";
import {
  checkoutSubscription,
  createPortalSession,
  getSubscriptionDetail,
} from "../controllers/subscription-controller.js";

export const subscriptionRouter = Router();

// Create checkout session for subscription
subscriptionRouter.post(
  "/checkout-subscription",
  authenticateToken,
  createRateLimiter("checkoutRL"),
  createLock("checkoutLock"),
  checkContentType("application/json"),
  validateRequestSchema({
    bodySchema: {
      plan: { required: true, type: "string" },
    },
  }),
  handleMiddlewareErrors,
  checkoutSubscription,
);

// Create customer portal session
subscriptionRouter.post(
  "/create-portal-session",
  authenticateToken,
  requireSubscription,
  createRateLimiter("customerPortalRL"),
  createLock("customerPortalLock", 3),
  handleMiddlewareErrors,
  createPortalSession,
);

// Get subscription details
subscriptionRouter.get(
  "/:userId",
  authenticateToken,
  createRateLimiter("subscriptionDetailRL"),
  handleMiddlewareErrors,
  getSubscriptionDetail,
);
