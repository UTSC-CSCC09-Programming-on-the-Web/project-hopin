import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";
import {
  checkRateLimit,
  consumeFailedAttempts,
  resetFailAttempts,
} from "../middleware/rate-limit.js";
import { releaseLock } from "../middleware/lock.js";

// Constants for subscription status and intervals
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const intervalToMs = {
  day: MS_PER_DAY,
  week: MS_PER_DAY * 7,
  month: MS_PER_DAY * 30,
  year: MS_PER_DAY * 365,
};

const intervalToLabel = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

// Create checkout session for subscription
export async function checkoutSubscription(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.email) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found or no email" });
    }

    // Prevent multiple subscriptions
    if (user.subscription && user.subscription.status === "active") {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(409)
        .json({ error: "User already has an active subscription" });
    }

    let { plan } = req.body;
    plan = plan.trim().toLowerCase();
    const existingPlan = await prisma.plan.findUnique({
      where: { name: plan },
    });

    if (!existingPlan) {
      if (await checkRateLimit(req, res)) return;
      return res.status(400).json({ error: "Invalid plan" });
    }

    const priceId = existingPlan.planId;
    if (!priceId) {
      if (await checkRateLimit(req, res)) return;
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    const session = await stripe.checkout.sessions.create(
      {
        metadata: {
          action: "subscription",
          userId,
        },
        customer_email: user.email,
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: { metadata: { userId } },
        success_url: `${process.env.CLIENT_URI}/home`,
        cancel_url: `${process.env.CLIENT_URI}/account/subscribe`,
      },
      {
        idempotencyKey: `checkout_${userId}_${Date.now()}`,
      },
    );

    await resetFailAttempts(req);

    res.json({
      id: session.id,
      userId: userId,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    await consumeFailedAttempts(req);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Create customer portal session
export async function createPortalSession(req, res, next) {
  const userId = req.user.id;
  const returnUrl = `${process.env.CLIENT_URI}/account`;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!user) {
      if (await checkRateLimit(req, res)) return;
      return res.status(404).json({ error: "User not found" });
    }

    const customerId = user?.subscription?.customerId;
    const stripeCustomer = customerId
      ? await stripe.customers.retrieve(customerId)
      : null;

    if (!customerId || !stripeCustomer) {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(409)
        .json({ error: "User does not have a Stripe customerId" });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    await resetFailAttempts(req);

    res.json({
      id: portalSession.id,
      customer: portalSession.customer,
      url: portalSession.url,
    });
  } catch (error) {
    await consumeFailedAttempts(req);
    console.error("Error creating portal session:", error);
    res.status(500).json({
      error: "Failed to create portal session",
      details: error.message,
    });
  } finally {
    await releaseLock(req.lockKey);
  }
}

// Get subscription details
export async function getSubscriptionDetail(req, res, next) {
  try {
    const userId = req.user.id;

    if (req.params.userId !== userId) {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(403)
        .json({ error: "Unauthorized subscription access attempt" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      await consumeFailedAttempts(req);
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscription;

    if (!subscription) {
      return res.status(200).json({
        subscription: null,
        message: "User does not have a subscription",
      });
    }

    const subscriptionData = await stripe.subscriptions.retrieve(
      subscription.subscriptionId,
    );

    if (subscriptionData.metadata?.userId !== user.id) {
      if (await checkRateLimit(req, res)) return;
      return res
        .status(403)
        .json({ error: "Unauthorized access to subscription data" });
    }

    const anchorDate = new Date(subscriptionData.billing_cycle_anchor * 1000);
    const now = new Date();
    const timeDiff = now.getTime() - anchorDate.getTime();
    const millisecondsPerInterval =
      intervalToMs[subscriptionData.plan.interval] ?? 0;
    const intervalCount = subscriptionData.plan.interval_count;
    const intervalPassed = Math.floor(
      timeDiff / (millisecondsPerInterval * intervalCount),
    );
    const nextBillingDate = new Date(
      anchorDate.getTime() +
        intervalPassed * intervalCount * millisecondsPerInterval,
    );

    await resetFailAttempts(req);

    res.json({
      id: subscriptionData.id,
      customerId: subscriptionData.customer,
      name: subscriptionData.plan?.nickname || "unknown",
      amount: subscriptionData.plan?.amount
        ? (subscriptionData.plan.amount / 100).toFixed(2)
        : "0.00",
      interval: intervalToLabel[subscriptionData.plan?.interval] || "unknown",
      nextBillingDate: nextBillingDate,
      startDate: new Date(subscriptionData.start_date * 1000),
      status: subscriptionData.status,
    });
  } catch (error) {
    await consumeFailedAttempts(req);
    return res.status(500).json({
      error: "Error getting subscription data",
      code: "INTERNAL_ERROR",
    });
  }
}
