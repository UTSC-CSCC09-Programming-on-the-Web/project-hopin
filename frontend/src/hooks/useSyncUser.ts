"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/stores/UserStore";
import useLocation from "./useLocation";
import { getUserGroup } from "@/stores/GroupStore";

export const useSyncUser = () => {
  const { data: session, status } = useSession();
  const { user, setLoading, refreshUser, updateLocation } = useUserStore();
  const location = useLocation();

  // When session changes, revalidate user data by fetching from the server
  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    refreshUser();
  }, [session, status, setLoading, refreshUser]);

  // Synchronize user location with the server
  useEffect(() => {
    if (!user?.id || !location) return;

    const syncLocation = async () => {
      try {
        await updateLocation(location);
      } catch (error) {
        console.error("Failed to update user location:", error);
      }
    };

    syncLocation();
  }, [user?.id, location, updateLocation]);

  // Fetch group data if user is authenticated
  useEffect(() => {
    if (!user?.id) return;
    getUserGroup();
  }, [user?.id]);
};
