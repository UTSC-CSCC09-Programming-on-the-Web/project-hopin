import { create } from "zustand";
import { Coordinates, Route } from "@/types/location";
import toast from "react-hot-toast";
import { fetchMapboxDirections } from "@/lib/apis/directionsAPI";
import "mapbox-gl/dist/mapbox-gl.css";
import { drawRoute } from "@/utils/mapUtils";

interface MapDomainState {
  map: mapboxgl.Map | null;
  setMap: (map: mapboxgl.Map) => void;

  route: Route | null;
  clearRoute: () => void;
  createRoute: (start: Coordinates, end: Coordinates) => Promise<void>;
}

export const useMapStore = create<MapDomainState>((set, get) => ({
  map: null,
  isMapReady: false,
  route: null,

  setMap: (map) => set({ map }),

  clearRoute: () => {
    const map = get().map;
    if (map?.getLayer("route")) map.removeLayer("route");
    if (map?.getSource("route")) map.removeSource("route");
    set({ route: null });
  },

  createRoute: async (start, end) => {
    const { map } = get();
    if (!map || !map.isStyleLoaded()) {
      toast.error("Map is not ready. Please try again.");
      return;
    }

    try {
      const routeData = await fetchMapboxDirections(start, end);
      const createdRoute: Route = {
        ...routeData,
        start_location: start,
        end_location: end,
      };
      set({ route: createdRoute });
      drawRoute(createdRoute, map, end);
      toast.success("Route created successfully!");
    } catch (error: unknown) {
      console.error("Error fetching route:", error);
      toast.error("Failed to fetch route. Please try again.");
    }
  },
}));

export const centerOnLocation = (location: Coordinates) => {
  const { map } = useMapStore.getState();
  if (!map) return;

  map.flyTo({
    center: [location.longitude, location.latitude],
    zoom: 14,
    essential: true, // This ensures the animation is not interrupted
  });
};
