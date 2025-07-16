"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { userApi } from "../lib/axios/userAPI";

type PermissionContextType = {
  // currentUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  subscriptionStatus: string;
  canAccess: (requireAuth?: boolean, requireSubscription?: boolean) => boolean;
};

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const { data: session, status } = useSession();
  const [subscriptionStatus, setSubscriptionStatus] = useState("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (session) {
      try {
        setLoading(true);
        userApi.getSubscriptionStatus()
          .then(subscriptionData => {
            setSubscriptionStatus(subscriptionData?.subscriptionStatus || "unknown");
          });
      } catch(error) {
        console.error("Error fetching subscription status:", error);
      } finally {
        setLoading(false);
      }
    } 

  }, [session, status]);
  
  const canAccess = (requireAuth = false, requireSubscription = false) => {
    if (requireAuth && !session) return false;
    if (requireSubscription && subscriptionStatus !== "active") return false;
    return true;
  }

  return (
    <PermissionContext.Provider
      value={{
        loading, 
        isAuthenticated: !!session,
        isSubscribed: subscriptionStatus === "active",
        subscriptionStatus,
        canAccess
      }}
    >
      { children }
    </PermissionContext.Provider>
  );
}

export const usePermissionContext = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissionContext must be used within a PermissionProvider");
  }
  return context;
}