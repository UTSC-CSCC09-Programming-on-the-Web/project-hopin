import { get } from "http";
import { getApi, getAuthenticatedApi } from "./api";
import { getSession } from "next-auth/react";

export const paymentApi = {
  
  createCheckoutSession: async (userId: string, userEmail: string, priceId: string) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi(session).post(
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

  createPortalSession: async (userId: string, customerId: string | null) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi(session).post(
        "payments/create-portal-session",
        {
          userId,
          customerId,
        },
      )
      window.location.href = response.data.url;
    } catch (error) {
      console.log("Error connecting to portal session:", error);
      throw error;
    }
  },

  getSubscriptionDetail: async (userId: string) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi(session).get(
        `payments/subscriptions/${userId}`, 
      )
      return response.data;
    } catch (error) {
      console.log("Error getting subscription detail:", error);
      throw error;
    }
  }, 
}
