"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { fetchMapboxDirections } from "../src/app/api/directionsAPI";
import { Coordinates, Route } from "../types/location";
import { drawRoute } from "./MapContextService";
import { useMap } from "../lib/hooks/useMap";

type MapContextType = {
  map: mapboxgl.Map | null;
  isMapReady: boolean;
  attachToContainer: (el: HTMLDivElement | null) => void;
  centerOnLocation: (location: Coordinates) => void;
  createRoute: (start: Coordinates, end: Coordinates) => void;
  clearRoute: () => void;
  route: Route | null;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapDomainProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [route, setRoute] = useState<Route | null>(null);
  const { map, isMapReady, attachToContainer, centerOnLocation } = useMap();

  // Memoized function to clear route
  const clearRoute = useCallback(() => {
    setRoute(null);
    // Clear route layer from map if it exists
    if (map && map.getLayer("route")) {
      map.removeLayer("route");
    }
    if (map && map.getSource("route")) {
      map.removeSource("route");
    }
  }, [map]);

  // Memoized function to create route
  const createRoute = useCallback(
    async (start: Coordinates, end: Coordinates) => {
      if (!map || !isMapReady) {
        console.warn("Map is not ready or initialized");
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
        setRoute(createdRoute);
        toast.success("Route created successfully!");
      } catch (error: unknown) {
        console.error("Error fetching route:", error);
        toast.error("Failed to fetch route. Please try again.");
      }
    },
    [map, isMapReady]
  );

  // Redraw route when route or map changes
  useEffect(() => {
    if (!route || !map || !isMapReady) return;

    try {
      drawRoute(route, map, route.end_location);
    } catch (error) {
      console.error("Error drawing route:", error);
      toast.error("Failed to display route on map.");
    }
  }, [route, map, isMapReady]);

  return (
    <MapContext.Provider
      value={{
        map,
        isMapReady,
        attachToContainer,
        centerOnLocation,
        createRoute,
        clearRoute,
        route,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a MapDomainProvider");
  }
  return context;
};
