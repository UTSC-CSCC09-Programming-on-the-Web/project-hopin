import { useEffect, useState } from "react";
import { Coordinates } from "@/types/location";

export default function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("location");
    if (stored) {
      try {
        setLocation(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setLocation(coords);
          localStorage.setItem("location", JSON.stringify(coords));
        },
        (err) => {
          console.warn("getCurrentPosition error:", err);
        },
        {
          enableHighAccuracy: true,
        }
      );
    };

    updateLocation();
    // Poll for location updates every 3 seconds
    const interval = setInterval(updateLocation, 3000);

    return () => clearInterval(interval);
  }, []);

  return location;
}
