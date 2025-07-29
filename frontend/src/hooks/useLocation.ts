import { useEffect, useState } from "react";
import { Coordinates } from "@/types/location";

export default function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    // Immediately get the current position
    // This is useful for the initial load to ensure we have a location right away
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => console.error("getCurrentPosition error:", err)
    );

    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => console.error(err)
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return location;
}
