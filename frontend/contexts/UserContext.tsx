"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "../types/user";
import toast from "react-hot-toast";
import { Coordinates } from "../types/location";
import useLocation from "../lib/hooks/useLocation";
import { userApi } from "../lib/axios/userAPI";
import { authApi } from "../lib/axios/authAPI";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";

type UserContextType = {
  currentUser: User | null;
  loading: boolean;
  setCurrentUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  updateProfile: (userData: FormData) => Promise<User>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const location = useLocation();

  // fetch additional user data from the backend using authApi refresh
  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      // Use authApi refreshSession for consistent session refresh
      const userData = await authApi.refreshSession();
      setCurrentUser(userData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Failed to refresh user data:", error);
        toast.error("Failed to refresh user data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(
    async (userData: FormData): Promise<User> => {
      setLoading(true);
      try {
        const updatedUser = await userApi.updateProfile(userData);
        setCurrentUser(updatedUser);
        toast.success("Profile updated successfully!");
        return updatedUser;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Failed to update profile:", error);
          toast.error("Failed to update profile. Please try again.");
          throw error;
        }
        throw new Error("Failed to update profile");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Sign out user
  const signOut = useCallback(async (): Promise<void> => {
    try {
      // Use authApi for backend signout
      await authApi.signOut();
      setCurrentUser(null);
      toast.success("Signed out successfully");
    } catch (error: unknown) {
      console.error("Error signing out:", error);
      // Even if there's an error, try to sign out with NextAuth
      await nextAuthSignOut({ callbackUrl: "/" });
      setCurrentUser(null);
      toast.error("Sign out may have failed. Redirecting to home page.");
    }
  }, []);

  // Delete user account
  const deleteAccount = useCallback(async (): Promise<void> => {
    try {
      await userApi.deleteUser();
      setCurrentUser(null);
      toast.success("Account deleted successfully");
      // Redirect to home page
      window.location.href = "/";
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error deleting account:", error);
        toast.error("Failed to delete account. Please try again.");
        throw error;
      }
      throw new Error("Failed to delete account");
    }
  }, []);

  // Check if the user is authenticated and fetch user data
  useEffect(() => {
    if (!session || status !== "authenticated") return;
    // Re-verify authentication status
    const revalidateAuth = async () => {
      // Try to fetch user data, if it fails it means that the user is not
      // authenticated on the server even though NextAuth thinks they are
      try {
        setLoading(true);
        const userData = await authApi.getCurrentUser();
        setCurrentUser(userData);
      } catch (error: unknown) {
        if (error instanceof Error) {
          await nextAuthSignOut({ callbackUrl: "/" });
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    revalidateAuth();
  }, [session, status]);

  // Update user location
  useEffect(() => {
    if (status !== "authenticated" || !session || !location) return;

    const updateUserLocation = async () => {
      try {
        const coordinates: Coordinates = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        const updatedUser = await userApi.updateLocationOrDestination(
          "location",
          coordinates
        );
        setCurrentUser(updatedUser);
      } catch (error) {
        console.error("Failed to update user location:", error);
        toast.error("Failed to update your location. Please try again.");
      }
    };

    updateUserLocation();
  }, [status, session, location]);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        loading,
        setCurrentUser,
        refreshUser,
        updateProfile,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
