import { create } from "zustand";
import { User } from "@/types/user";
import { Coordinates } from "@/types/location";
import toast from "react-hot-toast";
import { userApi } from "@/lib/apis/userAPI";
import { authApi } from "@/lib/apis/authAPI";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { AxiosError } from "axios";

interface UserState {
  user: User | null;
  loadingUser: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  refreshUser: () => Promise<void>;
  updateProfile: (formData: FormData) => Promise<User>;
  updateLocation: (location: Coordinates) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loadingUser: true,
  setUser: (user) => set({ user: user }),
  setLoading: (loading) => set({ loadingUser: loading }),

  refreshUser: async () => {
    set({ loadingUser: true });
    try {
      const userData = await authApi.getCurrentUser();
      set({ user: userData });
    } catch (error: unknown) {
      if (
        error instanceof AxiosError &&
        error.response?.status !== 401 &&
        error.response?.status !== 403
      ) {
        console.error("Failed to refresh user data:", error);
        toast.error("Failed to refresh user data. Please try again.");
      }

      set({ user: null });
      await nextAuthSignOut({ callbackUrl: "/" });
    } finally {
      set({ loadingUser: false });
    }
  },

  updateProfile: async (userData) => {
    set({ loadingUser: true });
    try {
      const updatedUser = await userApi.updateProfile(userData);
      set({ user: updatedUser });
      toast.success("Profile updated successfully!");
      return updatedUser;
    } catch (error: unknown) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile. Please try again.");
      throw error;
    } finally {
      set({ loadingUser: false });
    }
  },

  updateLocation: async (location) => {
    try {
      const updatedUser = await userApi.updateLocationOrDestination(
        "location",
        location
      );

      set({ user: updatedUser });
    } catch (error) {
      console.error("Failed to update user location:", error);
      toast.error("Failed to update your location. Please try again.");
    }
  },

  signOut: async () => {
    try {
      await authApi.signOut();
    } catch (error) {
      console.error("Backend sign out failed:", error);
    } finally {
      set({ user: null });
      await nextAuthSignOut({ callbackUrl: "/" });
    }
  },

  deleteAccount: async () => {
    try {
      await userApi.deleteUser();
      set({ user: null });
      toast.success("Account deleted successfully");
      window.location.href = "/";
    } catch (error: unknown) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
      throw error;
    }
  },
}));
