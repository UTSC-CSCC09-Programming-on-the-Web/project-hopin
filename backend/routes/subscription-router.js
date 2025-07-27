import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { createLock } from "../middleware/lock.js";
import { handleMiddlewareErrors } from "../middleware/error-handler.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { checkContentType, validateRequestPayload } from "../middleware/validate-request-payload.js";
import {
  checkoutSubscription,
  createPortalSession,
  getSubscriptionDetail,
} from "../controllers/subscription-controller.js";

export const subscriptionRouter = Router();

subscriptionRouter.use(helmet());

// Create checkout session for subscription
subscriptionRouter.post(
  "/checkout-subscription",
  authenticateToken,
  createRateLimiter("checkoutRL"),
  createLock("checkoutLock"),
  checkContentType("application/json"),
  validateRequestPayload({
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
