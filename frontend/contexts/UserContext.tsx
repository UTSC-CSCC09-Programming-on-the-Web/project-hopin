"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "../types/user";
import toast from "react-hot-toast";
import { Coordinates } from "../types/location";
import useLocation from "../lib/hooks/useLocation";

type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: "test-user-id",
    name: "John Doe",
    isReady: true,
  });

  const location = useLocation();

  useEffect(() => {
    // Update user location
    if (!currentUser?.id || !location) return;
    const updateUserLocation = async () => {
      try {
        const coordinates: Coordinates = {
          latitude: location.latitude,
          longitude: location.longitude,
        };

        // TODO: Replace with actual API call to update user location
        setCurrentUser((prevUser) => {
          if (!prevUser) return null;
          return {
            ...prevUser,
            location: coordinates,
          };
        });
      } catch (error) {
        console.error("Failed to update user location:", error);
        toast.error("Failed to update your location. Please try again.");
      }
    };

    updateUserLocation();
  }, [currentUser?.id, location]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
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
