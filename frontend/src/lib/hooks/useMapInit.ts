import mapboxgl from "mapbox-gl";
import { useCallback } from "react";
import { useMapStore } from "@/stores/MapStore";

// Custom hook to manage Mapbox map initialization
export const useMapInit = () => {
  const { map, setMap } = useMapStore();

  const attachToContainer = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;

      if (map) {
        const container = map.getContainer();
        if (el.contains(container)) return;
        el.innerHTML = "";
        el.appendChild(container);
        map.resize();
        return;
      }

      const mapInstance = new mapboxgl.Map({
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
        container: el,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-79.3832, 43.6532], // Toronto
        zoom: 12,
      });

      mapInstance.on("error", (e) => console.error("Mapbox error:", e));

      setMap(mapInstance);
    },
    [map, setMap],
  );

  return {
    attachToContainer,
    map,
  };
};
