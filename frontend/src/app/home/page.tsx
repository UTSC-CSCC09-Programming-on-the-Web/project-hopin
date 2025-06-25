"use client";
import HopinLogo from "../ui/hopin-logo";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { userApi } from "../api/users";

const handleSignOut = async () => {
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

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  return (
    <main>
      <div className="p-10">
        {status === "loading" && <p>Loading session...</p>}
        {status === "unauthenticated" && <p>You are not signed in</p>}
        {status === "authenticated" && (
          <>
            <div className="flex flex-row gap-8 items-center px-20">
              <HopinLogo />

              <button
                onClick={handleSignOut}
                className="text-sm font-bold border-1 p-2 rounded-sm"
              >
                Log Out
              </button>

              <button
                onClick={() => router.push("/profile")}
                className="text-sm font-bold border-1 p-2 rounded-sm"
              >
                Profile
              </button>
            </div>
            <div>This is the home page</div>
            <p>Welcome, {session.user?.name}!</p>
            <p>Email: {session.user?.email}</p>
          </>
        )}
      </div>
    </main>
  );
}
