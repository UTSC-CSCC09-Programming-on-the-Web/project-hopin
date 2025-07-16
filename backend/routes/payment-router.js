import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const stripe = new Stripe(process.env.STRIPE_SKEY);
export const paymentRouter = Router();

paymentRouter.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId, userEmail, priceId } = req.body; 
    const session = await stripe.checkout.sessions.create({
      metadata: {
        userId,
      },
      customer_email: userEmail,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url:
        "http://localhost:3000/home",
      cancel_url: "http://localhost:3000/subscribe",
    });
    res.json({
      id: session.id,
      metadata: session.metadata,
      customer_email: session.customer_email,
      mode: session.mode,
      url: session.url,
      success_url: session.success_url,
      cancel_url: session.cancel_url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res
      .status(500)
      .json({
        error: "Failed to create checkout session",
        details: error.message,
      });
  }
});

paymentRouter.post("/create-portal-session", async (req, res) => {
  const { userId, customerId } = req.body; // TODO: Verify user is authenticated
  // Verify user trying to access the portal is the same as the user that created a checkout session
  // const checkoutSession =
  //   await stripe.checkout.sessions.retrieve(customerId);
  // const customer = checkoutSession.metadata.userId;
  // if (userId !== customer) {
  //   res
  //     .status(404)
  //     .json({ error: "You are not authorized to view the portal session" });
  //   return;
  // }
  const returnUrl = "http://localhost:3000/account";
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    res.json(portalSession); // TODO: Filter fields
  } catch (error) {
    console.error("Error creating portal session:", error);
    res
      .status(500)
      .json({
        error: "Failed to create portal session",
        details: error.message,
      });
  }
});

// stripe listen --forward-to localhost:8080/api/payments/stripe-webhook --skip-verify
paymentRouter.post("/stripe-webhook", async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  // verify the signature sent by stripe
  const signature = req.headers["stripe-signature"];
  const rawBody = req.body;
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
    // Handle events
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutEvent = event.data.object;
        const userId = checkoutEvent.metadata.userId;
        try {
          // update user's customerId
          await prisma.user.update({
            where: { id: userId },
            data: { 
              customerId: checkoutEvent.customer,
              subscriptionStatus: "active",
            },
          });
          const subscription = await stripe.subscriptions.retrieve(checkoutEvent.subscription);
          if (subscription) {
            // store the new subscription in db
            await prisma.userSubscription.upsert({
              where: { 
                userId: userId,
               }, 
              update: {
                subscriptionId: subscription.id,
                plan: subscription.items.data[0].price.nickname,
                startDate: new Date(subscription.items.data[0].current_period_start * 1000), 
                endDate: new Date(subscription.items.data[0].current_period_end * 1000),
              }, 
              create: {
                userId,
                subscriptionId: subscription.id,
                plan: subscription.items.data[0].price.nickname,
                status: "active",  
                startDate: new Date(subscription.items.data[0].current_period_start * 1000), 
                endDate: new Date(subscription.items.data[0].current_period_end * 1000),
                isCurrent: true,
              }, 
            });
          }
        } catch (error) {
          console.log("Error updating user's subscription data in the database:", error);
          return res.status(400).json({ error: "Database update failed" });
        }  
        console.log("checkout.session.completed successfully handled");
        break;
      case "customer.subscription.updated":
        const updatedSubscription = event.data.object;
        const customerId = updatedSubscription.customer;
        
        const user = await prisma.user.findUnique({
          where: { customerId },
        })

        if (!user) {
          console.error("User not found with corresponding stripe customer ID: ", customerId);
          return res.status(404).json({ error: "User not found" });
        }

        const item = updatedSubscription.items.data[0];
        const plan = item?.price?.nickname; // TODO: change to product
        
        await prisma.userSubscription.upsert({
          where: { subscriptionId: updatedSubscription.id },
          update: {
            plan: plan ?? "none",
            status: updatedSubscription.status,
            startDate: new Date(item?.current_period_start * 1000),
            endDate: new Date(item?.current_period_end * 1000),
            isCurrent: true,
          },
          create: {
            userId: user.id,
            subscriptionId: updatedSubscription.id,
            plan: plan ?? "none", 
            status: updatedSubscription.status,
            startDate: new Date(item?.current_period_start * 1000),
            endDate: new Date(item?.current_period_end * 1000),
            isCurrent: true,
          },
        });
        console.log("customer.subscription.updated successfully handled");
        break;
      case "customer.subscription.deleted":
        try {
          const deletedSubscription = event.data.object;
          const customerId = deletedSubscription.customer;

          const user = await prisma.user.findUnique({
            where: { customerId },
          });

          if (!user) {
            console.error("User not found with corresponding stripe customer ID: ", customerId);
            return res.status(404).json({ error: "User not found" });
          }

          await prisma.userSubscription.delete({
            where: {
              subscriptionId: deletedSubscription.id,
            },
          });
          
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              subscriptionStatus: "canceled",
            }
          });
        } catch (error) {
          console.log("Error updating subscription deletion in database:", error);
          return res.status(500).json({ error: "Database update failed" });
        }
        console.log("customer.subscription.deleted successfully handled");
        break; 
      case "invoice.payment_failed": 
        try {
          const failedPayment = event.data.object;
          const customerId = failedPayment.customer;

          const user = await prisma.user.findUnique({
            where: { customerId },
          })

          if (!user) {
            console.error("User not found with corresponding stripe customer ID: ", customerId);
            return res.status(404).json({ error: "User not found" });
          } 

          await prisma.user.update({
            where: { customerId },
            data: {
              subscriptionStatus: "paused",
            }
          });

          await prisma.userSubscription.updateMany({
            where: { userId: user.id },
            data: {
              status: "paused",
              isCurrent: false,
            }
          });
        } catch (error) {
          console.log("Error updating failed payment in database:", error);
          return res.status(400).json({ error: "Database update failed" });
        }
        console.log("invoice.payment_failed successfully handled");
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    res.json({received: true});
  } catch (error) {
    console.log("Webhook signature verification failed:", error);
    return res.status(400);
  }
});
