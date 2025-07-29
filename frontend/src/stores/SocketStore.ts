import { create } from "zustand";
import { Socket, io } from "socket.io-client";
import { initSocketHandlers } from "@/lib/initSocketHandlers";

type SocketState = {
  socket: Socket | null;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
};

const socketURI = process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  connectSocket: (token) => {
    const socket = io(socketURI, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("WebSocket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
    });

    initSocketHandlers(socket);
    set({ socket });
  },
  disconnectSocket: () => {
    set((state) => {
      state.socket?.disconnect();
      return { socket: null };
    });
  },
}));
