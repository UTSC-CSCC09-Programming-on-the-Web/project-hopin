import { useGroupStore } from "@/stores/GroupStore";
import { useSocketStore } from "@/stores/SocketStore";
import { useUserStore } from "@/stores/UserStore";
import { useEffect, useState } from "react";

interface ExtendedDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

export default function useDeviceOrientation() {
  const [heading, setHeading] = useState<number | null>(null);
  const driver = useGroupStore((s) => s.group?.driver);
  const user = useUserStore((s) => s.user);
  const isDriver = driver?.id === user?.id;
  const socket = useSocketStore((s) => s.socket);

  useEffect(() => {
    const handleOrientation = (event: ExtendedDeviceOrientationEvent) => {
      // iOS uses webkitCompassHeading; fallback to alpha
      const compass = event.webkitCompassHeading ?? event.alpha;
      if (typeof compass === "number") {
        setHeading(360 - compass); // convert to clockwise from North
      }
    };

    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true
    );
    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation
      );
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  // Sync the user heading with the server
  useEffect(() => {
    if (!isDriver || heading === null || !socket) return;
    socket.emit("update_heading", { heading });
  }, [heading, isDriver, socket]);

  return heading;
}
