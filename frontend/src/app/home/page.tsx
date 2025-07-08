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

import HopinLogo from "../ui/hopin-logo";

export default function HomePage() {
  const { createGroup } = useGroupContext();
  const router = useRouter();

  const handleCreateGroupClick = () => {
    createGroup();
    router.push("/group");
  };

  return (
    <>
      <HopinLogo></HopinLogo>
      <div className="flex flex-col items-center gap-8 p-4 ">
        <div className="relative w-full h-[70vh] aspect-video">
          <Map />
        </div>
        <div className="flex flex-row gap-4 md:gap-8 items-center">
          {/* TODO: replace with a dynamic route with a generated room id */}
          <Button
            className="text-xs md:text-sm"
            text="Create Group"
            onClick={handleCreateGroupClick}
          />
          <div className=" text-sm md:text-lg">OR</div>
          <Button
            className="text-xs md:text-sm"
            text="Join Group"
            variant="outline"
          />
        </div>
      </div>
    </>
  );
}
