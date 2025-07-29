"use client";

import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "./SocketContext";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>{children}</SocketProvider>
    </SessionProvider>
  );
}
