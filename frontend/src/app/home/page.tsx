"use client";

import { useSession, signOut } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <main>
      <div className="p-10">
        {status === "loading" && <p>Loading session...</p>}
        {status === "unauthenticated" && <p>You are not signed in</p>}
        {status === "authenticated" && (
          <>
            <div className="flex flex-row gap-8 items-center px-20">
              <div className="flex flex-row gap-8 p-20">
                <img src="logo.png" alt="HopIn Logo" />
                <h1 className="font-bold text-5xl">HopIn</h1>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm font-bold border-1 p-2 rounded-sm"
              >
                Log Out
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
