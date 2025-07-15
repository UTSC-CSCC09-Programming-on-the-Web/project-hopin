import { get } from "http";
import { getApi } from "./api";

export const paymentApi = {
  
  createCheckoutSession: async (userId: string, userEmail: string, priceId: string) => {
    try {
      const response = await getApi().post(
        "payments/create-checkout-session", 
        {
            userId,
            userEmail,
            priceId,
        }
        );
        console.log("@paymentAPI :: ", response.data);
        return response.data;
    } catch (error) {
      console.error('PaymentAPI: Error creating checkout session:', error);
      throw error;
    }
  },

  createPortalSession: async (userId: string, stripeCustomerId: string | null) => {
    try {
      const response = await getApi().post(
        "payments/create-portal-session",
        {
          userId,
          stripeCustomerId,
        },
      )
      window.location.href = response.data.url;
    } catch (error) {}
  }
}
