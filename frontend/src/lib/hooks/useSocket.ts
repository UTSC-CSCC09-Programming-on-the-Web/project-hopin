"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/stores/UserStore";
import { useSocketStore } from "@/stores/SocketStore";

const useSocket = () => {
  const { data: session } = useSession();
  const loading = useUserStore((s) => s.loadingUser);
  const user = useUserStore((s) => s.user);
  const { socket, connectSocket, disconnectSocket } = useSocketStore();

  useEffect(() => {
    if (loading) return;

    if (!session?.accessToken || !user?.id) {
      disconnectSocket();
      return;
    }

    if (!socket) connectSocket(session.accessToken);
  }, [
    session?.accessToken,
    loading,
    user?.id,
    socket,
    connectSocket,
    disconnectSocket,
  ]);
};

export default useSocket;
