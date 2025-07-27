import { stripe } from "../lib/stripe.js";
import redisClient from "../lib/redisClient.js";
import { prisma } from "../lib/prisma.js";
import { withLock } from "../utils/withLock.js";

const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

// TODO:
// Validate paymentIntent.status === "succeeded" when fulfilling order
// prevent replay attacks
// Test handlers

// Verify the signature sent by stripe
function verifyWebhookSignature(req) {
  const signature = req.headers["stripe-signature"];
  const rawBody = req.body;
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
    return event;
  } catch (error) {
    console.log("Webhook signature verification failed");
    return res.status(400);
  }
}

export async function handleWebhook(req, res) {
  const event = verifyWebhookSignature(req);

  // Store received stripe events
  const redisKey = `stripe:event:${event.id}:${event.type}:${event.data.object.id}`;
  const newEvent = await redisClient.set(redisKey, "pending", {
    NX: true,
    EX: 60 * 60 * 24,
  });

  if (!newEvent) {
    return res.json({ error: "The webhook event has already been received" });
  }

  try {
    await handleEvent(event);
    await redisClient.set(redisKey, "done");
    return res.json({
      stripeEvent: event.id,
      received: true,
    });
  } catch (error) {
    console.error("Error processing webhook event:", error.message);
    await redisClient.del(redisKey);
    return res.status(500).json({
      stripeEvent: event.id,
      received: false,
      error: "Failed to process a webhook event",
    });
  }
}

async function handleEvent(event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event);
      break;
    case "checkout.session.expired":
      await handleCheckoutExpired(event);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    case "invoice.payment_succeeded":
      await handlePaymentSucceded(event);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event);
      break;
    case "customer.deleted":
      await handleCustomerDeleted(event);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
}

// TODO: check session.mode if split payment enabled
async function handleCheckoutCompleted(event) {
  const session = event.data.object;

  // Retrieve userId
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error("UserId unavailable");
  }

  // Check userId is valid in our db
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Get subscription detail
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );

  if (subscription) {
    const newPlan = subscription.items.data[0].plan || null;
    const existingPlan = await prisma.plan.findUnique({
      where: { planId: newPlan?.id },
    });

    // Compare with the plan defined in db
    const validPlan =
      newPlan.id === existingPlan.planId &&
      newPlan.nickname === existingPlan.name;

    if (!newPlan || !validPlan) {
      throw new Error("Plan is invalid");
    }

    // Subscription data to store
    const subscriptionItem = subscription.items.data[0];
    const subscriptionData = {
      customerId: subscription.customer,
      subscriptionId: subscription.id,
      startDate: new Date(subscriptionItem.current_period_start * 1000),
      endDate: new Date(subscriptionItem.current_period_end * 1000),
      status: subscription.status,
    };

    try {
      await withLock(`checkoutCompleted:${userId}`, 10, async () => {
        const result = await prisma.subscription.upsert({
          where: { userId },
          update: {
            ...subscriptionData,
            plan: { connect: { id: existingPlan.id } },
          },
          create: {
            ...subscriptionData,
            user: { connect: { id: userId } },
            plan: { connect: { id: existingPlan.id } },
          },
        });

        return result;
      });
    } catch (lockError) {
      console.log("Lock/Database error:", lockError);
      throw lockError;
    }
  }
  console.log("checkout.session.completed successfully handled");
}

async function handleCheckoutExpired(event) {
  const session = event.data.object;

  // Retrieve userId
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error("UserId unavailable");
  }

  // Check userId is valid in our db
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  if (!subscription) {
    throw Error("No subscription data available");
  }

  const newPlan = subscription.items.data[0].plan || null;
  const existingPlan = await prisma.plan.findUnique({
    where: { planId: newPlan?.id },
  });

  // Compare with the plan defined in db
  const validPlan =
    newPlan.id === existingPlan.planId &&
    newPlan.nickname === existingPlan.name;

  if (!newPlan || !validPlan) {
    throw new Error("Plan is invalid");
  }

  // Subscription data to store
  const subscriptionData = {
    customerId: subscription.customer,
    subscriptionId: subscription.id,
    status: "inactive",
  };

  try {
    await withLock(`checkoutExpired:${userId}`, 10, async () => {
      const result = await prisma.subscription.upsert({
        where: { userId },
        update: {
          ...subscriptionData,
          plan: { connect: { id: existingPlan.id } },
        },
        create: {
          ...subscriptionData,
          user: { connect: { id: userId } },
          plan: { connect: { id: existingPlan.id } },
        },
      });

      return result;
    });
  } catch (lockError) {
    console.log("Lock/Database error:", lockError);
    throw lockError;
  }
  console.log("checkout.session.expired successfully handled");
}

async function handleSubscriptionUpdated(event) {
  const updatedSubscription = event.data.object;

  const userId = deletedSubscription.metadata?.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!userId || !user) {
    throw Error("No userId passed or user does not exist");
  }

  const userSubscription = await prisma.subscription.findUnique({
    where: {
        userId,
        customerId: updatedSubscription.customer,
     },
    include: { user: true },
  });

  if (!userSubscription) {
    throw Error("No subscription to update");
  }

  const subscriptionItem = updatedSubscription.items.data[0];
  const newPlan = subscriptionItem.plan || null;
  const existingPlan = await prisma.plan.findUnique({
    where: { planId: newPlan?.id },
  });

  // Compare with the plan defined in db
  const validPlan =
    newPlan.id === existingPlan.planId &&
    newPlan.nickname === existingPlan.name;

  if (!newPlan || !validPlan) {
    throw new Error("Plan is invalid");
  }

  // Subscription data to store
  const subscriptionData = {
    subscriptionId: updatedSubscription.id,
    startDate: new Date(subscriptionItem.current_period_start * 1000),
    endDate: new Date(subscriptionItem.current_period_end * 1000),
    status: updatedSubscription.status,
  };

  try {
    await withLock(`subscriptionUpdate:${userId}`, 10, async () => {
      const result = await prisma.subscription.upsert({
        where: { userId },
        update: {
          ...subscriptionData,
          plan: { connect: { id: existingPlan.id } },
        },
        create: {
          ...subscriptionData,
          user: { connect: { id: userId } },
          plan: { connect: { id: existingPlan.id } },
        },
      });

      return result;
    });
  } catch (lockError) {
    console.log("Lock/Database error:", lockError);
    throw lockError;
  }
  console.log("customer.subscription.updated successfully handled");
}

async function handleSubscriptionDeleted(event) {
  const deletedSubscription = event.data.object;

  const userId = deletedSubscription.metadata?.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!userId || !user) {
    throw Error("No userId passed or user does not exist");
  }

  const userSubscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!userSubscription) {
    throw Error("No subscription to delete");
  }

  try {
    await withLock(`subscriptionDeleted:${user.id}`, 10, async () => {
      await prisma.subscription.delete({
        where: { subscriptionId: deletedSubscription.id },
      });
    });
  } catch (lockError) {
    console.log("Lock/Database error:", lockError);
    throw lockError;
  }

  console.log("customer.subscription.deleted successfully handled");
}

async function handlePaymentSucceded(event) {
  const invoice = event.data.object;

  // Want to update subscription data
  if (invoice.billing_reason.includes("subscription")) {
    const customerId = invoice.customer;
    const subscriptionId = invoice.parent.subscription_details.subscription;

    const userSubscription = await prisma.subscription.findUnique({
      where: { customerId, subscriptionId },
    });

    // Want to handle only recurring payment.succeeded event
    // (ie. Exclude the first time a subscription payment was made)
    if (!userSubscription) {
      throw Error("No matching subscription to update");
    }

    // Verify status is paid
    if (invoice.status !== "paid") {
      throw Error("Payment was succeeded, yet status mismatch");
    }

    const newSubscriptionData =
      await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItem = newSubscriptionData.items.data[0];
    const newStartDate = new Date(subscriptionItem.current_period_start * 1000);
    const newEndDate = new Date(subscriptionItem.current_period_end * 1000);

    try {
      await withLock(
        `paymentSuccess:${userSubscription.userId}`,
        10,
        async () => {
          await prisma.subscription.update({
            where: { customerId, subscriptionId },
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              status: "active",
            },
          });
        },
      );
    } catch (lockError) {
      console.log("Lock/Database error:", lockError);
      throw lockError;
    }

    console.log("invoice.payment_succeeded handled successfully");
  }
}

async function handlePaymentFailed(event) {
  const invoice = event.data.object;

  // Want to update subscription data
  if (invoice.billing_reason.includes("subscription")) {
    const customerId = invoice.customer;
    const subscriptionId = invoice.parent.subscription_details.subscription;

    const userSubscription = await prisma.subscription.findUnique({
      where: { customerId, subscriptionId },
    });

    if (!userSubscription) {
      throw Error("No matching subscription to update");
    }

    try {
      await withLock(
        `paymentFailed:${userSubscription.userId}`,
        10,
        async () => {
          await prisma.subscription.update({
            where: { customerId, subscriptionId },
            data: {
              status: "inactive",
            },
          });
        },
      );
    } catch (lockError) {
      console.log("Lock/Database error:", lockError);
      throw lockError;
    }

    console.log("invoice.payment_succeeded handled successfully");
  }
}

async function handleCustomerDeleted(event) {
  const customer = event.data.object;
  const customerId = customer.id;
  if (!customer || !customerId) throw Error("Customer unavailable");

  try {
    await withLock(`deleteCustomer:${customerId}`, 10, async () => {
      const deleteSubscription = await prisma.subscription.findUnique({
        where: { customerId },
      });
      console.log(deleteSubscription);
      if (deleteSubscription) {
        await prisma.subscription.deleteMany({ where: { customerId } });
      }
    });
  } catch (lockError) {
    console.log("Lock/Database error:", lockError);
    throw lockError;
  }

  console.log("customer.deleted handled successfully");
}
