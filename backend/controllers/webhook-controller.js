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
      await handleInvoicePaymentSucceded(event);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      break;
    case "customer.deleted":
      await handleCustomerDeleted(event);
      break;
    // case "account.updated":
    //   await handleAccountUpdated(event);
    //   break;
    // case "payment_intent.succeeded":
    //   await handlePaymentIntentSucceeded(event);
    //   break;
    // case "payment_intent.processing":
    //   await handlePaymentIntentProcessing(event);
    //   break;
    // case "payment_intent.payment_failed":
    //   await handlePaymentIntentFailed(event);
    //   break;
    // case "transfer.created":
    //   await handleTransferCreated(event);
    //   break;
    // case "transfer.paid":
    //   await handleTransferPaid(event);
    //   break;
    // case "transfer.failed":
    //   await handleTransferFailed(event);
    //   break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
}

/****************** Subscription Handlers  ***************/

// Checkout is completed when Stripe has registered a user
// for a subscription
async function handleCheckoutCompleted(event) {
  const session = event.data.object;

  if (session.metadata?.action !== "subscription") return; // Not an error

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

    // Automatically onboard user to Stripe Connect after successful subscription
    // try {
    //   await onboardUserToConnect(userId);
    // } catch (onboardError) {
    //   console.log(
    //     "Auto-onboarding failed, user can onboard manually later:",
    //     onboardError.message,
    //   );
    //   // Don't throw here - subscription was successful, onboarding can happen later
    // }
  }
  console.log("checkout.session.completed successfully handled");
}

// Checkout is expired when payment processes did not go
// through fully
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

// For any updates in the subscription plans
async function handleSubscriptionUpdated(event) {
  const updatedSubscription = event.data.object;

  const userId = updatedSubscription.metadata?.userId;
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

async function handleInvoicePaymentSucceded(event) {
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

async function handleInvoicePaymentFailed(event) {
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

/************ Managing Fare Payments ***********/

// Upon onboarding users on Stripe Connect
// async function handleAccountUpdated(event) {
//   const account = event.data.object;
//   if (!account || !account.id) {
//     throw new Error("Account data unavailable");
//   }

//   const userId = account.metadata?.userId;
//   if (!userId) {
//     throw new Error("User ID not available inside account data");
//   }

//   try {
//     const payoutsEnabled = account.payouts_enabled;
//     const detailsSubmitted = account.details_submitted;
//     const chargesEnabled = account.charges_enabled;
//     const accountData = {
//       payoutsEnabled,
//       detailsSubmitted,
//       chargesEnabled,
//     };

//     await withLock(`accountUpdate:${userId}`, 10, async () => {
//       const connectAccount = await prisma.connectAccount.upsert({
//         where: { userId },
//         update: accountData,
//         create: {
//           accountId: account.id,
//           ...accountData,
//         },
//       });
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }
//   console.log("account.updated handled successfully");
// }

// async function handlePaymentIntentSucceeded(event) {
//   const paymentIntent = event.data.object;

//   if (!paymentIntent || paymentIntent.metadata?.action !== "fare") {
//     console.log("PaymentIntent not for fare payment, skipping");
//     return;
//   }

//   const userId = paymentIntent.metadata?.userId;
//   const groupId = paymentIntent.metadata?.groupId;
//   const farePaymentId = paymentIntent.metadata?.farePaymentId;
//   const userFarePaymentId = paymentIntent.metadata?.userFarePaymentId;

//   if (!userId || !groupId || !farePaymentId) {
//     throw new Error("Missing required metadata in PaymentIntent");
//   }

//   try {
//     await withLock(`paymentSuccess:${farePaymentId}`, 15, async () => {
//       // Update fare payment status to succeeded
//       const farePayment = await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           status: "succeeded",
//           paymentIntentId: paymentIntent.id,
//           updatedAt: new Date(),
//         },
//         include: {
//           group: {
//             include: {
//               owner: true,
//               driver: true,
//             },
//           },
//         },
//       });

//       // Update user fare payment status
//       await prisma.userFarePayment.updateMany({
//         where: {
//           userId: userId,
//           farePaymentId: farePaymentId,
//         },
//         data: {
//           paymentStatus: "paid",
//           amountPaid: paymentIntent.amount,
//           paidAt: new Date(),
//         },
//       });

//       // Get recipient (group driver who should receive the payment)
//       const recipientUserId = farePayment.group.driverId;

//       // Check if recipient has connected account
//       const recipientAccount = await prisma.connectAccount.findUnique({
//         where: { userId: recipientUserId },
//       });

//       const amount = paymentIntent.amount - platformFee;

//       // Create transfer to recipient
//       const transfer = await stripe.transfers.create({
//         amount: amount,
//         currency: paymentIntent.currency,
//         destination: recipientAccount.accountId,
//         description: `Fare payment for ride in group ${groupId}`,
//         metadata: {
//           farePaymentId: farePaymentId,
//           paymentIntentId: paymentIntent.id,
//           recipientUserId: recipientUserId,
//         },
//       });

//       // Update fare payment with transfer info
//       await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           transferId: transfer.id,
//           transferAmount: amount,
//         },
//       });

//       console.log(
//         `Transfer ${transfer.id} created for fare payment ${farePaymentId}`,
//       );
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }

//   console.log("payment_intent.succeeded handled successfully");
// }

// async function handlePaymentIntentProcessing(event) {
//   const paymentIntent = event.data.object;

//   if (!paymentIntent || paymentIntent.metadata?.action !== "fare") {
//     console.log("PaymentIntent not for fare payment, skipping");
//     return;
//   }

//   const farePaymentId = paymentIntent.metadata?.farePaymentId;
//   const userId = paymentIntent.metadata?.userId;

//   if (!farePaymentId || !userId) {
//     throw new Error(
//       "Missing farePaymentId or userId in PaymentIntent metadata",
//     );
//   }

//   try {
//     await withLock(`paymentProcessing:${farePaymentId}`, 10, async () => {
//       await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           status: "processing",
//           paymentIntentId: paymentIntent.id,
//         },
//       });

//       // Update user fare payment status
//       await prisma.userFarePayment.updateMany({
//         where: {
//           userId: userId,
//           farePaymentId: farePaymentId,
//         },
//         data: {
//           paymentStatus: "processing",
//         },
//       });
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }

//   console.log("payment_intent.processing handled successfully");
// }

// async function handlePaymentIntentFailed(event) {
//   const paymentIntent = event.data.object;

//   if (!paymentIntent || paymentIntent.metadata?.action !== "fare") {
//     console.log("PaymentIntent not for fare payment, skipping");
//     return;
//   }

//   const farePaymentId = paymentIntent.metadata?.farePaymentId;
//   const userId = paymentIntent.metadata?.userId;

//   if (!farePaymentId || !userId) {
//     throw new Error(
//       "Missing farePaymentId or userId in PaymentIntent metadata",
//     );
//   }

//   try {
//     await withLock(`paymentFailed:${farePaymentId}`, 10, async () => {
//       await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           status: "failed",
//           paymentIntentId: paymentIntent.id,
//         },
//       });

//       // Update user fare payment status
//       await prisma.userFarePayment.updateMany({
//         where: {
//           userId: userId,
//           farePaymentId: farePaymentId,
//         },
//         data: {
//           paymentStatus: "failed",
//         },
//       });
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }

//   console.log("payment_intent.payment_failed handled successfully");
// }

/* A PaymentIntent might have more than one Charge object 
associated with it if there were multiple payment attempts, 
for examples retries. For each charge you can inspect the 
outcome and details of the payment method used.

setup_future_sage: off_session while creating paymentIntent
statement_descriptor: "Ride ()" .length < 22 char
metadata: {
}
*/

// Transfer event handlers
// async function handleTransferCreated(event) {
//   const transfer = event.data.object;

//   if (!transfer || !transfer.metadata?.farePaymentId) {
//     console.log("Transfer not related to fare payment, skipping");
//     return;
//   }

//   const farePaymentId = transfer.metadata.farePaymentId;

//   try {
//     await withLock(`transferCreated:${farePaymentId}`, 10, async () => {
//       await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           transferId: transfer.id,
//           transferStatus: "created",
//           updatedAt: new Date(),
//         },
//       });
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }

//   console.log("transfer.created handled successfully");
// }

// async function handleTransferPaid(event) {
//   const transfer = event.data.object;

//   if (!transfer || !transfer.metadata?.farePaymentId) {
//     console.log("Transfer not related to fare payment, skipping");
//     return;
//   }

//   const farePaymentId = transfer.metadata.farePaymentId;

//   try {
//     await withLock(`transferPaid:${farePaymentId}`, 10, async () => {
//       await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           transferStatus: "paid",
//           transferCompletedAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }

//   console.log("transfer.paid handled successfully");
// }

// async function handleTransferFailed(event) {
//   const transfer = event.data.object;

//   if (!transfer || !transfer.metadata?.farePaymentId) {
//     console.log("Transfer not related to fare payment, skipping");
//     return;
//   }

//   const farePaymentId = transfer.metadata.farePaymentId;
//   const recipientUserId = transfer.metadata?.recipientUserId;

//   try {
//     await withLock(`transferFailed:${farePaymentId}`, 10, async () => {
//       await prisma.farePayment.update({
//         where: { id: farePaymentId },
//         data: {
//           transferStatus: "failed",
//         },
//       });
//     });
//   } catch (lockError) {
//     console.log("Lock/Database error:", lockError);
//     throw lockError;
//   }

//   console.log("transfer.failed handled successfully");
// }

// Helper function to automatically onboard users to Stripe Connect
// async function onboardUserToConnect(userId) {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     include: { connectAccount: true },
//   });

//   if (!user) {
//     throw new Error("User not found");
//   }

//   // Skip if user already has a connect account
//   if (user.connectAccount?.accountId) {
//     console.log(
//       `User ${userId} already has Connect account ${user.connectAccount.accountId}`,
//     );
//     return user.connectAccount;
//   }

//   try {
//     // Create a Connect account
//     const account = await stripe.accounts.create({
//       type: "express",
//       email: user.email,
//       capabilities: {
//         transfers: { requested: true },
//         card_payments: { requested: true },
//       },
//       metadata: { userId },
//     });

//     // Store connect account details
//     const accountData = {
//       accountId: account.id,
//       payoutEnabled: account.payouts_enabled || false,
//       chargesEnabled: account.charges_enabled || false,
//       detailsSubmitted: account.details_submitted || false,
//       userId: userId,
//     };

//     const connectAccount = await prisma.connectAccount.upsert({
//       where: { userId },
//       update: accountData,
//       create: accountData,
//     });

//     // Generate onboarding link for the user to complete setup
//     const accountLink = await stripe.accountLinks.create({
//       account: account.id,
//       refresh_url: `${process.env.CLIENT_URI}/onboarding/refresh`,
//       return_url: `${process.env.CLIENT_URI}/onboarding/complete`,
//       type: "account_onboarding",
//     });

//     // Store the onboarding URL temporarily (it expires in ~25 minutes)
//     // You might want to store this in Redis or send it via email/notification
//     console.log(`Onboarding URL for user ${userId}: ${accountLink.url}`);
//     console.log(
//       "Note: This URL expires in ~25 minutes and should be sent to the user immediately",
//     );

//     console.log(`Created Connect account ${account.id} for user ${userId}`);
//     return connectAccount;
//   } catch (error) {
//     console.error("Error creating Connect account:", error);
//     throw error;
//   }
// }
