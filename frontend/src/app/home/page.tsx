"use client";

import React from "react";
import { signOut } from "next-auth/react";

export default function page() {
  return (
    <main>
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
      <div>tis is home page</div>
    </main>
  );
}
