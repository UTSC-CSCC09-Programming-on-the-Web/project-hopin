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
  createRateLimiter("checkoutRL", {
    maxAttemptsIP: 10,
    durationIP: 60 * 10,
    maxAttemptsUserIP: 3,
    durationUserIP: 60 * 15,
    enableProgressive: true,
  }),
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
  createRateLimiter("customerPortalRL", {
    maxAttemptsIP: 15,
    durationIP: 60 * 10,
    maxAttemptsUserIP: 5,
    durationUserIP: 60 * 10,
    enableProgressive: true,
  }),
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
