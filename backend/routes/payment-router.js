import { Router } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SKEY);
export const paymentRouter = Router();

paymentRouter.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      metadata: {
        userId: req.body.userId
      },
      // customer_email: req.body.userEmail,
      mode: "subscription",
      line_items: [
        {
          price: req.body.priceId,
          quantity: 1,
        }
      ],
      success_url: "http://localhost:3000/subscribe/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/subscribe"
    });
    console.log("@paymentAPI createCheckoutSession ", session);
    res.json(session); // TODO: Filter fields to return 
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session", details: error.message });
  }
});

paymentRouter.post("/create-portal-session", async (req, res) => {
  const { userId, checkoutSessionId } = req.body; // TODO: Verify user is authenticated
  // Verify user trying to access the portal is the same as the user that created a checkout session
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const customer = checkoutSession.metadata.userId;
  if (userId !== customer ) {
    res.status(404).json({ error: "You are not authorized to view the portal session" });
    return;
  }
  const returnUrl = "http://localhost:3000/profile";
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer,
      return_url: returnUrl,
    });
    res.json(portalSession); // TODO: Filter fields 
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create portal session", details: error.message });
  }
});

//   res.redirect(303, portalSession.url);
// });

// paymentRouter.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   (request, response) => {
//     let event = request.body;
//     // Replace this endpoint secret with your endpoint's unique secret
//     // If you are testing with the CLI, find the secret by running 'stripe listen'
//     // If you are using an endpoint defined with the API or dashboard, look in your webhook settings
//     // at https://dashboard.stripe.com/webhooks
//     const endpointSecret = 'whsec_12345';
//     // Only verify the event if you have an endpoint secret defined.
//     // Otherwise use the basic event deserialized with JSON.parse
//     if (endpointSecret) {
//       // Get the signature sent by Stripe
//       const signature = request.headers['stripe-signature'];
//       try {
//         event = stripe.webhooks.constructEvent(
//           request.body,
//           signature,
//           endpointSecret
//         );
//       } catch (err) {
//         console.log(`⚠️  Webhook signature verification failed.`, err.message);
//         return response.sendStatus(400);
//       }
//     }
//     let subscription;
//     let status;
//     // Handle the event
//     switch (event.type) {
//       case 'customer.subscription.trial_will_end':
//         subscription = event.data.object;
//         status = subscription.status;
//         console.log(`Subscription status is ${status}.`);
//         // Then define and call a method to handle the subscription trial ending.
//         // handleSubscriptionTrialEnding(subscription);
//         break;
//       case 'customer.subscription.deleted':
//         subscription = event.data.object;
//         status = subscription.status;
//         console.log(`Subscription status is ${status}.`);
//         // Then define and call a method to handle the subscription deleted.
//         // handleSubscriptionDeleted(subscriptionDeleted);
//         break;
//       case 'customer.subscription.created':
//         subscription = event.data.object;
//         status = subscription.status;
//         console.log(`Subscription status is ${status}.`);
//         // Then define and call a method to handle the subscription created.
//         // handleSubscriptionCreated(subscription);
//         break;
//       case 'customer.subscription.updated':
//         subscription = event.data.object;
//         status = subscription.status;
//         console.log(`Subscription status is ${status}.`);
//         // Then define and call a method to handle the subscription update.
//         // handleSubscriptionUpdated(subscription);
//         break;
//       case 'entitlements.active_entitlement_summary.updated':
//         subscription = event.data.object;
//         console.log(`Active entitlement summary updated for ${subscription}.`);
//         // Then define and call a method to handle active entitlement summary updated
//         // handleEntitlementUpdated(subscription);
//         break;
//       default:
//         // Unexpected event type
//         console.log(`Unhandled event type ${event.type}.`);
//     }
//     // Return a 200 response to acknowledge receipt of the event
//     response.send();
//   }
// );

// export const fulfill = internalAction({
//   args: {signature: v.string(), payload: v.string()},
//   handler: async (ctx, args) => {
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
//     try {
//       const event = stripe.webhooks.constructEvent(
//         args.payload,
//         args.signature,
//         webhookSecret
//       ); // verify response is from Stripe
//       if (event.type==="checkout.session.completed") {
//         const checkoutEvent = event.data.object as Stripe.Checkout.Session & {
//           metadata: { userId: Id<"users"> };
//         };
//         const subscription = (await stripe.subscriptions.retrieve(
//           checkoutEvent.subscription as string
//         )) as Stripe.Subscription;

//         const priceId = subscription.items.data[0].price.id;
//         const userId = checkoutEvent.metadata.userId;

//         try {
//           await ctx.runMutation(internal.users.createSubscription {
//             userId,
//             subscriptionId: subscription.id,
//             currentPeriodEnd: 
//               subscription.items.data[0].current_period_end * 1000,
//             lastRenewalDate:
//               subscription.items.data[0].current_period_start * 1000,
//             status: "active",
//           })
//         }catch(err{

//         })
//       } else if (event.type === "customer.subscription.updated") {
//         const subscription = event.data.object as Stripe.Subscription;
//         const priceId = subscription.items.data[0].price.id;
//         const subscriptionId = subscription.id;
//         await ctx.runMutation(internal.users.updateSubscriptionBySubId, {
//           subscriptionId,
//           currentPeriodEnd:
//             subscription.items.data[0].current_period_end * 1000, 
//           lastRenewalDate:
//               subscription.items.data[0].current_period_start * 1000,
//           status: ["
            
//       }
//       return {success: true}
//     }
//   } ca
// })