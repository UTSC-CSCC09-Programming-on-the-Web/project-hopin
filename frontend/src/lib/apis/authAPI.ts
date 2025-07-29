import { getApi, getAuthenticatedApi } from "./api";
import { handleApiError } from "@/utils/apiUtils";
import { AxiosError } from "axios";
import { getSession, signOut as nextAuthSignOut } from "next-auth/react";

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

export interface SigninData {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  accessToken: string;
  message?: string;
}

/**
 * Get current session information
 */
export const getCurrentSession = async () => {
  try {
    const session = await getSession();
    return session;
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
};

export const authApi = {
  /**
   * Sign up a new user
   */
  signup: async ({
    email,
    password,
    name,
  }: SignupData): Promise<AuthResponse> => {
    try {
      const api = getApi();
      const response = await api.post("/auth/signup", {
        email,
        password,
        name,
      });

      return response.data;
    } catch (error) {
      console.error("Signup error:", error);
      return handleApiError(error as AxiosError);
    }
  },

  /**
   * Sign in an existing user
   * Note: This is primarily for credential-based login
   * For NextAuth integration, use the NextAuth signin method
   */
  signin: async ({ email, password }: SigninData): Promise<AuthResponse> => {
    try {
      const api = getApi();
      const response = await api.post("/auth/signin", {
        email,
        password,
      });

      return response.data;
    } catch (error) {
      console.error("Signin error:", error);
      return handleApiError(error as AxiosError);
    }
  },

  /**
   * Get current user information using session
   */
  getCurrentUser: async () => {
    const session = await getSession();

    if (!session?.accessToken) {
      throw new Error(
        "Authentication token not available. Please sign in again."
      );
    }

    try {
      const authenticatedApi = await getAuthenticatedApi();
      const response = await authenticatedApi.get("/auth/me");
      return response.data;
    } catch (error) {
      console.error("Get current user error:", error);
      return handleApiError(error as AxiosError);
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<{ message: string }> => {
    try {
      const session = await getSession();

      if (session?.accessToken) {
        const authenticatedApi = await getAuthenticatedApi();
        await authenticatedApi.post("/auth/signout");
      }
    } catch (error) {
      console.warn(
        "Backend signout failed, but continuing with client cleanup:",
        error
      );
    }

    // Clear NextAuth session
    await nextAuthSignOut({ callbackUrl: "/" });

    return { message: "Signed out successfully" };
  },

  /**
   * Get a fresh token for an already authenticated user (for NextAuth users)
   * This is used when NextAuth users need a backend JWT token
   */
  getToken: async (email: string): Promise<{ token: string }> => {
    try {
      const api = getApi();
      const response = await api.post("/auth/get-token", { email });
      return response.data;
    } catch (error) {
      console.error("Get token error:", error);
      return handleApiError(error as AxiosError);
    }
  },

  /**
   * Handle Google authentication
   * This is called by NextAuth during the Google OAuth flow
   */
  handleGoogleAuth: async (
    email: string,
    name: string
  ): Promise<AuthResponse> => {
    try {
      const api = getApi();
      const response = await api.post("/auth/google", {
        email,
        name,
      });

      return response.data;
    } catch (error) {
      console.error("Google auth error:", error);
      return handleApiError(error as AxiosError);
    }
  },

  /**
   * Get current session
   */
  getCurrentSession,

  /**
   * Refresh user session data
   */
  refreshSession: async () => {
    try {
      const session = await getSession();
      if (!session) {
        throw new Error("No active session found");
      }

      // Simply call getCurrentUser to get fresh data
      const userData = await authApi.getCurrentUser();
      return userData;
    } catch (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }
  },
};
