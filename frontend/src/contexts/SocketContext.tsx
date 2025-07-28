"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/stores/UserStore";
import { initSocketHandlers } from "@/lib/initSocketHandlers";

const socketURI = process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { data: session } = useSession();
  const loading = useUserStore((s) => s.loadingUser);
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    const setupSocket = async () => {
      if (loading) {
        // Still loading session, don't do anything yet
        return;
      }

      if (user === null) {
        // User is not authenticated, disconnect socket if exists
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
        return;
      }

      // Avoid redundant connections
      if (socket || !session?.accessToken || !user || loading) return;

      // Connect only if not already connected and user is authenticated

      const newSocket = io(socketURI, {
        auth: {
          token: session.accessToken,
        },
        withCredentials: true,
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on("connect", () => {
        console.log("WebSocket connected:", newSocket.id);
        setSocket(newSocket);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("WebSocket disconnected:", reason);
        setSocket(null);
      });

      newSocket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        setSocket(null);
      });

      // Initialize the rest of the socket handlers
      initSocketHandlers(newSocket);

      // Set initial socket state
      setSocket(newSocket);
    };

    setupSocket();
    // Cleanup function
    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [socket, session, loading, user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context;
};
