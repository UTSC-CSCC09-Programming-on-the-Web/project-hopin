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

      const response = await getApi().get("/users", { params });

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
    try {
      const response = await getApi().get(`/users/${userId}`);
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

      return response.data;
    } catch (error) {
      console.error("Update user error:", error);
      handleApiError(error as AxiosError);
    }
  },

  updateLocation: async (coordinates: Coordinates) => {
    try {
      const session = await getSession();
      if (!session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const response = await (
        await getAuthenticatedApi()
      ).patch(`/users/${session.userId}/location`, coordinates);

      if (response.status === 204) return;
    } catch (error) {
      console.error(`Failed to update user location:`, error);
      handleApiError(error as AxiosError);
    }
  },

  updateDestination: async (destination: Place) => {
    try {
      const session = await getSession();
      if (!session?.userId) {
        throw new Error("Authentication required. Please sign in again.");
      }
      const response = await (
        await getAuthenticatedApi()
      ).patch(`/users/${session.userId}/destination`, destination);
      if (response.status === 204) return;
    } catch (error) {
      console.error("Failed to update user destination:", error);
      handleApiError(error as AxiosError);
    }
  },

  signOut: async () => {
    try {
      const session = await getSession();

      if (session?.accessToken) {
        await (await getAuthenticatedApi()).post("/auth/signout");
      }
    } catch (error) {
      console.warn(
        "Backend signout failed, but continuing with client cleanup:",
        error
      );
    }

    // Use NextAuth signOut for proper session cleanup
    await nextAuthSignOut({ callbackUrl: "/" });
    return { message: "Signed out successfully" };
  },

  deleteUser: async () => {
    const session = await getSession();

    if (!session?.accessToken || !session?.userId) {
      throw new Error("Authentication required. Please sign in again.");
    }

    try {
      const response = await (
        await getAuthenticatedApi()
      ).delete(`/users/${session.userId}`);

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
};
