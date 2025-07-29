"use client";

import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useUserStore } from "@/stores/UserStore";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSyncUser } from "@/lib/hooks/useSyncUser";
import useSocket from "@/lib/hooks/useSocket";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loadingUser);
  const router = useRouter();

  useSyncUser();
  useSocket();

  // Checks if the user is logged in (this layout wraps protected pages)
  useEffect(() => {
    if (!loading && !user) {
      toast.error("You must be logged in to view this page.");
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingSpinner text="Loading your data..." />;
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between items-center h-screen">
      <Header />
      {children}
    </div>
  );
};

export default AuthLayout;
