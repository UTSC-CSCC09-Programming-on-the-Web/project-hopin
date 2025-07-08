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
    <>
      <div className="flex flex-row justify-between p-2 px-4 items-center md:px-20 md:py-6  gap-2 md:gap-4">
        <Link
          key="hopin-logo"
          href="/home"
          className="flex flex-row items-center gap-2 md:gap-6 p-2 md:p-4"
        >
          <img src="logo.png" alt="HopIn Logo" className="w-8 md:w-12 h-auto" />
          <h1 className="font-bold text-2xl md:text-5xl">HopIn</h1>
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={handleSignOut}
            className="text-sm md:text-md font-bold border-1 p-2 rounded-sm"
          >
            Log Out
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="text-sm md:text-md font-bold border-1 p-2 rounded-sm"
          >
            Profile
          </button>
        </div>
      </div>
    </>
  );
}
