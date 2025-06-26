"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { fetchMapboxDirections } from "../lib/directionsAPI";
import { Coordinates, Route } from "../types/location";
import { drawRoute, updateRoute } from "./MapContextService";
import useUsersOnMap from "../lib/hooks/useUsersOnMap";

type MapContextType = {
  map: mapboxgl.Map | null;
  attachToContainer: (el: HTMLDivElement | null) => void;
  centerOnLocation: (location: Coordinates) => void;
  createRoute: (start: Coordinates, end: Coordinates) => void;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapDomainProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // const [originalRoute, setOriginalRoute] = useState<Route | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [route, setRoute] = useState<Route | null>(null);

  const attachToContainer = (el: HTMLDivElement | null) => {
    if (!el) return;

    // First-time mount
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
        container: el,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-79.3832, 43.6532],
        zoom: 12,
      });
    } else {
      const currentContainer = mapRef.current.getContainer();
      if (el.contains(currentContainer)) return;

      el.innerHTML = "";
      el.appendChild(currentContainer);
      mapRef.current.resize();
    }
  };

  const centerOnLocation = (location: Coordinates) => {
    if (!mapRef.current) {
      console.warn("Map is not initialized");
      return;
    }
    mapRef.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      essential: true, // This ensures the animation is not interrupted
    });
  };

  // Hook to manage user markers on the map
  useUsersOnMap(mapRef.current);

  // Redraw route when updated
  useEffect(() => {
    if (!route || !mapRef.current) return;
    drawRoute(route, mapRef.current, route.end_location);
  }, [route]);

  const createRoute = (start: Coordinates, end: Coordinates) => {
    if (!mapRef.current) {
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
        // setOriginalRoute(createdRoute);
        setRoute(createdRoute);
      })
      .catch((error: any) => {
        console.error("Error fetching route:", error);
        toast.error("Failed to fetch route. Please try again.");
      });
  };

  return (
    <MapContext.Provider
      value={{
        map: mapRef.current,
        attachToContainer,
        centerOnLocation,
        createRoute,
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
