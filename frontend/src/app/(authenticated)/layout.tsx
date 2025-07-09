"use client";

import Header from "@/components/Header";
import { useUserContext } from "../../../contexts/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Loader as LoadingIcon } from "lucide-react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useUserContext();
  const router = useRouter();

  // Checks if the user is logged in (this layout wraps protected pages)
  useEffect(() => {
    if (!loading && !currentUser) {
      toast.error("You must be logged in to view this page.");
      router.push("/");
    }
  }, [loading, currentUser, router]);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-4 items-center justify-center h-screen">
        <LoadingIcon className="animate-spin text-gray-500" size={24} />
        <div className="label text-gray-500">Loading...</div>
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between items-center h-screen gap-8">
      <Header />
      {children}
    </div>
  );
};

export default AuthLayout;
