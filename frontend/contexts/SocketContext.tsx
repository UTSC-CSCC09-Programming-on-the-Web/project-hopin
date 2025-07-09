"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const socketURI = process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (status === "loading") {
      // Still loading session, don't do anything yet
      return;
    }

    if (status !== "authenticated" || !session?.accessToken) {
      // User is not authenticated, disconnect socket if exists
      if (socketRef.current) {
        console.log("Disconnecting socket - user not authenticated");
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Connect only if not already connected and user is authenticated
    if (!socketRef.current && session.accessToken) {
      console.log("Connecting to WebSocket...");

      socketRef.current = io(socketURI, {
        auth: {
          token: session.accessToken,
        },
        withCredentials: true,
        transports: ["websocket", "polling"], // Fallback to polling if websocket fails
      });

      socketRef.current.on("connect", () => {
        console.log("WebSocket connected:", socketRef.current?.id);
        setSocket(socketRef.current);
      });

      socketRef.current.on("disconnect", (reason) => {
        console.log("WebSocket disconnected:", reason);
        setSocket(null);
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        setSocket(null);
      });

      // When one of the users in the group updates their status,
      // broadcast the update to all users in the group
      socketRef.current.on("user_status_update", (data) => {
        const { user, updateType, timestamp } = data;
        // Switch updateType: locationUpdate, destinationUpdate, readyStatusUpdate, profileUpdate, statusUpdate
        console.log(
          `User status update received: ${updateType} for user ${user.id} at ${timestamp}`
        );
      });

      // Set initial socket state
      setSocket(socketRef.current);
    }

    // Cleanup function
    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection");
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [session, status]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  // Allow null context - this happens when user is not authenticated
  // Components should handle null socket gracefully
  return context;
};

export const useRequiredSocket = () => {
  const socket = useSocket();
  if (!socket) {
    throw new Error(
      "Socket connection required but not available. User may not be authenticated."
    );
  }
  return socket;
};

export const useSocketStatus = () => {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    const handleConnecting = () => {
      setIsConnecting(true);
    };

    // Check initial state
    setIsConnected(socket.connected);
    setIsConnecting(!socket.connected && socket.active);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connecting", handleConnecting);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connecting", handleConnecting);
    };
  }, [socket]);

  return {
    isConnected,
    isConnecting,
    hasSocket: !!socket,
  };
};
