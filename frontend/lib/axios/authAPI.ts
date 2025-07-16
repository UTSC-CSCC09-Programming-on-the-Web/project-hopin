import { getApi, getAuthenticatedApi } from "./api";
import { handleApiError } from "../../src/utils/apiUtils";
import { AxiosError } from "axios";
import { getSession, useSession } from "next-auth/react";
import { NextResponse } from "next/server";
import { use } from "react";

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
 * Check if user is authenticated by verifying session
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await getSession();
    return !!(session?.accessToken && session?.userId);
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
};

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
      const authenticatedApi = getAuthenticatedApi(session);
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
        const authenticatedApi = getAuthenticatedApi(session);
        await authenticatedApi.post("/auth/signout");
      }
    } catch (error) {
      console.warn(
        "Backend signout failed, but continuing with client cleanup:",
        error
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
   * Check if the current user is authenticated
   */
  isAuthenticated,

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

      // Force a session update by calling getCurrentUser
      const userData = await authApi.getCurrentUser();
      return userData;
    } catch (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }
  },

  // validateToken: async () => {
  //   try {
  //     const session = await getSession();
  //     console.log("SESSSSHHH", session);
  //     if (session?.accessToken) {
  //       const authenticatedApi = getAuthenticatedApi(session);
  //       const res = await authenticatedApi.post("/auth/validate-token");
  //       console.log("@@@authApi ", res);
  //       return res.data.valid;
  //     }
  //   } catch (error) {
  //     console.warn(
  //       "Backend signout failed, but continuing with client cleanup:",
  //       error
  //     );
  //   }
  // },
};
