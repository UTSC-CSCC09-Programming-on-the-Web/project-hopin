// "use client";

// import { useSession, signOut } from "next-auth/react";

// export default function HomePage() {
//   const { data: session, status } = useSession();

//   return (
//     <main>
//       <div className="p-10">
//         {status === "loading" && <p>Loading session...</p>}
//         {status === "unauthenticated" && <p>You are not signed in</p>}
//         {status === "authenticated" && (
//           <>
//             <div className="flex flex-row gap-8 items-center px-20">
//               <div className="flex flex-row gap-8 p-20">
//                 <img src="logo.png" alt="HopIn Logo" />
//                 <h1 className="font-bold text-5xl">HopIn</h1>
//               </div>

//               <button
//                 onClick={() => signOut({ callbackUrl: "/" })}
//                 className="text-sm font-bold border-1 p-2 rounded-sm"
//               >
//                 Log Out
//               </button>
//             </div>
//             <div>This is the home page</div>
//             <p>Welcome, {session.user?.name}!</p>
//             <p>Email: {session.user?.email}</p>
//           </>
//         )}
//       </div>
//     </main>
//   );
// }
"use client";
import Button from "@/components/buttons/Button";
import Map from "@/components/Map";
import { useGroupContext } from "../../../contexts/GroupContext";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { userApi } from "../../../lib/axios/userAPI";
import HopinLogo from "../ui/hopin-logo";

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

export default function HomePage() {
  const { createGroup } = useGroupContext();
  const router = useRouter();

  const handleCreateGroupClick = () => {
    createGroup();
    router.push("/group");
  };

  return (
    <>
      <div className="flex flex-col justify-between items-center h-screen gap-8">
        <div className="relative z-10 flex items-center px-16 w-full bg-white justify-between">
          <HopinLogo />

          <div className="flex gap-4 items-center">
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
        </div>
        <div className="fixed inset-0">
          <div className="relative h-screen w-full">
            <Map />
          </div>
        </div>
        <div className="flex gap-8 items-center bg-white p-10 rounded-lg shadow-lg z-10 mb-4">
          {/* TODO: replace with a dynamic route with a generated room id */}
          <Button text="Create Group" onClick={handleCreateGroupClick} />
          <div className="text-lg">OR</div>
          <Button text="Join Group" variant="outline" />
        </div>
      </div>
    </>
  );
}
