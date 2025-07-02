"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { User } from "../types/user";
import toast from "react-hot-toast";
import { Coordinates } from "../types/location";
import useLocation from "../lib/hooks/useLocation";
import { userApi } from "../src/app/api/userAPI";
import { useSession } from "next-auth/react";

type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { data: session, status } = useSession(); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const location = useLocation();

  // Check authentication status when app loads & connect to NextAuth session
  useEffect(() => {
    setLoading(status === "loading");
    if (status === "authenticated" && session?.user) {
      setCurrentUser({
        id: session.user?.id,
        email: session.user?.email ?? undefined,
        name: session.user?.name ?? undefined,
        avatar: session.user?.avatar ?? undefined,
      });
    } else if (status === "unauthenticated") {
      setCurrentUser(null);
    }
  }, [session, status]);

  // fetch additional user data from the backend
  const refreshUser = useCallback(async() => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      userApi.getUserById(currentUser.id)
        .then((userData) => {
          setCurrentUser(prevData => ({
            ...prevData,
            ...userData,
          }))
        });
    } catch (error) {
      console.error("Failed to refresh user data: ", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // handles login/logout
  // useEffect(() => {
  //   const handleAuthChange;
  //   window.addEventListener("next-auth.session-token", handleAuthChange);
  // }, []);
  
  // Update user location
  useEffect(() => {
    if (!currentUser?.id || !location) return;
    const updateUserLocation = async () => {
      try {
        const coordinates: Coordinates = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        userApi.updateLocationOrDestination(currentUser.id, "location", coordinates)
          .then((updatedUser) => {
            setCurrentUser(updatedUser);
          });
      } catch (error) {
        console.error("Failed to update user location:", error);
        toast.error("Failed to update your location. Please try again.");
      }
    };

    updateUserLocation();
  }, [currentUser?.id, location]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isLoading, refreshUser }}>
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
