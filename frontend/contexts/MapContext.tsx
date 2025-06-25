"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { fetchMapboxDirections } from "../lib/directionsAPI";
import { Coordinates } from "../types/location";

type MapContextType = {
  location: Coordinates | undefined;
  map: React.RefObject<mapboxgl.Map | null>;
  mapContainer: React.RefObject<HTMLDivElement | null>;
  drawRoute: (start: Coordinates, end: Coordinates) => void;
};

const MapContext = createContext<MapContextType>({
  location: undefined,
  map: { current: null },
  mapContainer: { current: null },
  drawRoute: () => {
    console.warn("setRoute function is not implemented");
  },
});

export const MapProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
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

  // Show user's location on the map
  useEffect(() => {
    if (!map.current || !location) return;

    // Clear old markers
    document.querySelectorAll(".user-marker").forEach((m) => m.remove());

    // Create marker element
    const el = document.createElement("div");
    el.className =
      "user-marker flex flex-col items-center justify-center gap-1";

    // TODO: Replace with user's profile picture when available
    el.innerHTML = `
    <div class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
    <img src="https://www.operationkindness.org/wp-content/uploads/blog-kitten-nursery-operation-kindness.jpg" class="w-full h-full object-cover" />
    </div>
    <span class="label-sm bg-white text-gray-900 px-1 shadow-xs rounded">You</span>
  `;

    new mapboxgl.Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current);

    map.current.setCenter([location.longitude, location.latitude]);
  }, [location]);

  const drawRoute = (start: Coordinates, end: Coordinates) => {
    if (!map.current) {
      console.warn("Map is not initialized");
      return;
    }

    drawRouteHelper(map.current, start, end);
  };

  return (
    <MapContext.Provider value={{ location, map, mapContainer, drawRoute }}>
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

const drawRouteHelper = (
  map: mapboxgl.Map,
  start: Coordinates,
  end: Coordinates
) => {
  fetchMapboxDirections(start, end)
    .then((route: any) => {
      const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: route.geometry,
      };

      // Redraw the route on the map
      if (map.getSource("route")) {
        (map.getSource("route") as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource("route", {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3887be",
            "line-width": 5,
            "line-opacity": 0.75,
          },
        });

        // Add a marker at the end point
        new mapboxgl.Marker()
          .setLngLat([end.longitude, end.latitude])
          .addTo(map);
      }
    })
    .catch((error: any) => {
      console.error("Error fetching route:", error);
    });
};
