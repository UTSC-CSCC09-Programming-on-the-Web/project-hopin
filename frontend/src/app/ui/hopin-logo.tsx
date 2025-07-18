"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { userApi } from "../../../lib/axios/userAPI";
import { useRouter } from "next/navigation";

export const handleSignOut = async () => {
  try {
    // Clear both NextAuth and custom JWT tokens
    await Promise.all([
      userApi.signOut(), // Clear custom JWT tokens
      signOut({ redirect: false }), // Clear NextAuth session without auto-redirect
    ]);

    console.log("User signed out successfully from all sessions");
    // Navigate to home page
    window.location.href = "/";
  } catch (error) {
    console.error("Error during unified sign out:", error);
    // Even if there's an error, try to navigate away
    alert("Sign out may have failed. Redirecting to home page.");
    window.location.href = "/";
  }
};

export default function HopinLogo() {
  const router = useRouter();
  return (
    <Link
      key="hopin-logo"
      href="/home"
      className="flex flex-row items-center gap-4 md:gap-6 md:gap-8"
    >
      <img src="logo.png" alt="HopIn Logo" />
      <h1 className="font-bold text-5xl">HopIn</h1>
    </Link>
  );
}
