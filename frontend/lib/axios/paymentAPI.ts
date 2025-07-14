import { get } from "http";
import { getApi } from "./api";

export const paymentApi = {
  
  createCheckoutSession: async (userId: string, priceId: string) => {
    try {
      const response = await getApi().post(
        "payments/create-checkout-session", 
        {
            userId,
            // userEmail
            priceId,
        }
        );
        return response.data;
    } catch (error) {
      console.error('PaymentAPI: Error creating checkout session:', error);
      throw error;
    }
  },

  createPortalSession: async (userId: string, checkoutSessionId: string) => {
    try {
      const response = await getApi().post(
        "payments/create-portal-session",
        {
          userId,
          checkoutSessionId,
        },
      )
      window.location.href = response.data.url;
    } catch (error) {}
  }
}


//   route({
//     path: "stripe", 
//     method: "POST", 
//     handler: httpAction(async (ctx, request) => {
//         const signature = request.hheaders.get("stripe-signature");
//         if (!signature) {
//             return new Response("Webhook Error: No signature", {status:400});
//         }
//         const result = await ctx.runAction(internal.stripe.fulfill, {
//             signature, 
//             payload: await request.text(),
//         } )
//         if (result.success) {
//             return new Response(null, { status: 200});
        
//         } else {
//             return new Response("Webhook Error:" + result.error, {status: 400});
//         }
//     })
//   })
// }