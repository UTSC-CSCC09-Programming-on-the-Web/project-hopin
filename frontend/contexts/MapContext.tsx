"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { fetchMapboxDirections } from "../lib/directionsAPI";
import { Coordinates, Route } from "../types/location";
import {
  drawRoute,
  findClosestIndex,
  showUserLocation,
  updateRoute,
} from "./MapContextService";

type MapContextType = {
  location: Coordinates | undefined;
  map: React.RefObject<mapboxgl.Map | null>;
  mapContainer: React.RefObject<HTMLDivElement | null>;
  createRoute: (start: Coordinates, end: Coordinates) => void;
};

const MapContext = createContext<MapContextType>({
  location: undefined,
  map: { current: null },
  mapContainer: { current: null },
  createRoute: () => {
    console.error("createRoute function is not implemented");
  },
});

export const MapProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [originalRoute, setOriginalRoute] = useState<Route | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [location, setLocation] = useState<Coordinates | undefined>(undefined);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Initialize Mapbox map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      style: "mapbox://styles/mapbox/streets-v12",
      container: mapContainer.current,
      center: [-79.3832, 43.6532],
      zoom: 12,
    });

    return () => map.current?.remove();
  }, []);

  // Subscribe to location updates
  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
      },
      (err) => {
        toast.error(`Error getting location: ${err.message}`);
        return navigator.geolocation.clearWatch(id);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000, // cache position for 1 second
        timeout: 5000, // revalidate position after 5 seconds
      }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    showUserLocation(map, location);
    setRoute(updateRoute(originalRoute, location));
  }, [location]);

  // Draw route on the map when route state changes
  useEffect(() => {
    if (!route || !map.current) return;

    drawRoute(route, map.current, route.end_location);
  }, [route]);

  const createRoute = (start: Coordinates, end: Coordinates) => {
    if (!map.current) {
      console.warn("Map is not initialized");
      return;
    }

    fetchMapboxDirections(start, end)
      .then((route: Route) => {
        const createdRoute = {
          ...route,
          start_location: start,
          end_location: end,
        };
        setOriginalRoute(createdRoute);
        setRoute(createdRoute);
      })
      // TODO: save route to database
      .catch((error: any) => {
        console.error("Error fetching route:", error);
        toast.error("Failed to fetch route. Please try again.");
      });
  };

  return (
    <MapContext.Provider value={{ location, map, mapContainer, createRoute }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error(
      "useLocationContext must be used within a LocationProvider"
    );
  }
  return context;
};
