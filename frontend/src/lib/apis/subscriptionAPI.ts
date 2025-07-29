import { get } from "http";
import { getApi, getAuthenticatedApi } from "./api";
import { getSession } from "next-auth/react";
import { authApi } from "./authAPI";

export const subscriptionApi = {
  createCheckoutSession: async (plan: string) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi().then((api) =>
        api.post("subscriptions/checkout-subscription", {
          plan,
        }),
      );

      return response.data;
    } catch (error) {
      console.error("PaymentAPI: Error creating checkout session:", error);
      throw error;
    }
  },

  createPortalSession: async () => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi().then((api) =>
        api.post("subscriptions/create-portal-session"),
      );
      window.location.href = response.data.url;
    } catch (error) {
      console.log("Error connecting to portal session:", error);
      throw error;
    }
  },

  getSubscriptionDetail: async () => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi().then((api) =>
        api.get(`subscriptions/${session.userId}`),
      );
      console.log(response);
      return response.data;
    } catch (error) {
      console.log("Error getting subscription detail:", error);
      throw error;
    }
  },
};
