import { create } from "zustand";
import { Coordinates } from "@/types/location";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { Route } from "@/types/route";

type RouteTypes = "group" | "user";
type RouteParams = {
  id: string;
  color: string;
};
const RouteStyles: Record<RouteTypes, RouteParams> = {
  group: {
    id: "group-route",
    color: "#3887be",
  },
  user: {
    id: "user-route",
    color: "#f28cb1",
  },
};

// Store markers per route type, only on client
const routeMarkers: Partial<Record<RouteTypes, mapboxgl.Marker[]>> = {};

interface MapDomainState {
  map: mapboxgl.Map | null;
  setMap: (map: mapboxgl.Map) => void;
  isLoaded: boolean;
  setIsLoaded: (isLoaded: boolean) => void;
}

export const useMapStore = create<MapDomainState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
  isLoaded: false,
  setIsLoaded: (isLoaded) => set({ isLoaded }),
}));

export const clearRoute = (type: RouteTypes) => {
  const map = useMapStore.getState().map;
  const routeId = RouteStyles[type].id;
  if (map?.getLayer(routeId)) map.removeLayer(routeId);
  if (map?.getSource(routeId)) map.removeSource(routeId);
  // Remove markers if they exist
  if (routeMarkers[type] && routeMarkers[type]!.length > 0) {
    routeMarkers[type]!.forEach((marker) => marker.remove());
    routeMarkers[type] = [];
  }
};

export const drawRoute = (route: Route, type: RouteTypes) => {
  const { map, isLoaded } = useMapStore.getState();
  if (!map || !isLoaded) return;

  const { id, color } = RouteStyles[type];

  const geojson = {
    type: "Feature" as const,
    geometry: route.geometry,
    properties: {},
  };

  clearRoute(type);

  // Initialize markers array for this route type if it doesn't exist
  if (!routeMarkers[type]) {
    routeMarkers[type] = [];
  }

  // Redraw the route on the map
  map.addSource(id, {
    type: "geojson",
    data: geojson,
  });

  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": color,
      "line-width": 5,
      "line-opacity": 0.75,
    },
  });

  // Add a marker at each of the route's checkpoints with the color
  // of that checkpoint
  route.checkpoints.forEach((checkpoint) => {
    const marker = new mapboxgl.Marker({ color: checkpoint.color })
      .setLngLat([checkpoint.location.longitude, checkpoint.location.latitude])
      .addTo(map);
    routeMarkers[type]!.push(marker);
  });
};

export const centerOnLocation = (location: Coordinates) => {
  const { map } = useMapStore.getState();
  if (!map) return;

  map.easeTo({
    center: [location.longitude, location.latitude],
    duration: 1000,
  });
};
