import { Coordinates, Place } from "@/types/location";
import { getApi, getAuthenticatedApi } from "./api";
import { AxiosError } from "axios";
import { handleApiError } from "@/utils/apiUtils";
import { getSession } from "next-auth/react";
import { signOut as nextAuthSignOut } from "next-auth/react";

// Auth-related API functions
let nextCursor: string | null = null;

export const userApi = {
  // Cursor-based pagination
  getAllUsers: async (take: number = 10, groupId?: string) => {
    const session = await getSession();

    if (!session?.accessToken || !session?.userId) {
      throw new Error("Authentication required. Please sign in again.");
    }

    try {
      interface UserQueryParams {
        take: number;
        cursor?: string | null;
        groupId?: string;
      }

      const params: UserQueryParams = { take };
      if (nextCursor) {
        params.cursor = nextCursor;
      }
      if (groupId) {
        params.groupId = groupId;
      }

      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.then((api) =>
        api.get("/users", { params }),
      );

      nextCursor = response.data.nextCursor;
      const users = response.data.users || [];

      return {
        success: true,
        users: users,
        nextCursor: response.data.nextCursor,
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Error loading users.",
        users: [],
        nextCursor: null,
        total: 0,
      };
    }
  },

  getUserById: async (userId: string) => {
    const session = await getSession();

    if (!session?.accessToken || !session?.userId) {
      throw new Error("Authentication required. Please sign in again.");
    }

    try {
      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.then((api) =>
        api.get(`/users/${userId}`),
      );
      console.log("Get user by id response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Get user by id error:", error);
      handleApiError(error as AxiosError);
    }
  },

  updateProfile: async (userData: FormData) => {
    const session = await getSession();

    if (!session?.accessToken || !session?.userId) {
      throw new Error("Authentication required. Please sign in again.");
    }

    try {
      // For FormData, we need to remove the Content-Type header to let the browser set it
      const response = await (
        await getAuthenticatedApi()
      ).patch(`/users/${session.userId}`, userData, {
        headers: {
          // Remove Content-Type to let browser set multipart/form-data with boundary
          "Content-Type": undefined,
        },
      });

      console.log("Update user response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Update user error:", error);
      handleApiError(error as AxiosError);
    }
  },

  updateLocationOrDestination: async (
    field: "location" | "destination",
    coordinates: Coordinates,
  ) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.then((api) =>
        api.patch(
          `/users/${session.userId}/position?field=${field}`,
          coordinates,
        ),
      );

      console.log(`Updated user ${field}:`, response.data[field]);
      return response.data;
    } catch (error) {
      console.error(`Failed to update user location:`, error);
      handleApiError(error as AxiosError);
    }
  },

  updateReadyStatus: async (isReady: boolean) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId)
        throw new Error("Authentication required. Please sign in again.");

      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.then((api) =>
        api.patch(`/users/${session.userId}/ready`, {
          isReady,
        }),
      );

      console.log("Updated user ready status:", response.data.isReady);
      return response.data;
    } catch (error) {
      console.error("Failed to update user ready status:", error);
      handleApiError(error as AxiosError);
    }
  },

  // Comprehensive status update - can update location, destination, and ready status in one request
  updateUserStatus: async (statusData: {
    location?: Coordinates;
    destination?: Coordinates | null;
    isReady?: boolean;
  }) => {
    try {
      const session = await getSession();
      if (!session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const response = await getAuthenticatedApi().then((api) =>
        api.patch(`/users/${session.userId}/status`, statusData),
      );

      return response.data;
    } catch (error) {
      console.error("Failed to update user destination:", error);
      handleApiError(error as AxiosError);
    }
  },

  signOut: async () => {
    try {
      const session = await getSession();

      if (session?.accessToken) {
        const authenticatedApi = getAuthenticatedApi();
        await authenticatedApi.then((api) => api.post("/auth/signout"));
      }
    } catch (error) {
      console.warn(
        "Backend signout failed, but continuing with client cleanup:",
        error,
      );
    }

    // Client-side cleanup - Clear NextAuth related items only
    // Note: NextAuth handles most of the session cleanup automatically
    if (typeof document !== "undefined") {
      // Clear NextAuth cookies by setting them to expire
      document.cookie =
        "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "next-auth.callback-url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    // NextAuth's signout method
    await nextAuthSignOut({ callbackUrl: "/", redirect: false });

    return { message: "Signed out successfully" };
  },

  deleteUser: async () => {
    const session = await getSession();

    if (!session?.accessToken || !session?.userId) {
      throw new Error("Authentication required. Please sign in again.");
    }

    try {
      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.then((api) =>
        api.delete(`/users/${session.userId}`),
      );

      // The API returns 204 No Content for successful deletion
      if (response.status === 204) {
        return { success: true };
      }
      return response.data;
    } catch (error) {
      console.error("Delete user error:", error);
      handleApiError(error as AxiosError);
    }
  },

  getSubscriptionStatus: async (userId?: string) => {
    try {
      const session = await getSession();
      if (!session?.accessToken || !session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await getAuthenticatedApi().then((api) =>
        api.get(`/users/${session.userId}/subscription-status`),
      );
      return response.data.subscriptionStatus ?? "unknown";
    } catch (error) {
      console.error("Subscription status check error:", error);
      handleApiError(error as AxiosError);
    }
  },

  isSubscribed: async (userId?: string) => {
    try {
      const subscriptionStatus = await userApi.getSubscriptionStatus(userId);
      return subscriptionStatus === "active";
    } catch (error) {
      console.error("isSubscribed check error:", error);
      return false;
    }
  },
};
