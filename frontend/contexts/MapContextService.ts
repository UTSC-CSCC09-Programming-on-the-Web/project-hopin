import { Coordinates, Route } from "../types/location";
import mapboxgl from "mapbox-gl";
import { Position } from "geojson";

export const showUserLocation = (
  map: React.RefObject<mapboxgl.Map | null>,
  location: Coordinates | undefined
) => {
  if (!map.current || !location) return;

  // Clear old markers
  document.querySelectorAll(".user-marker").forEach((m) => m.remove());

  // Create marker element
  const el = document.createElement("div");
  el.className = "user-marker flex flex-col items-center justify-center gap-1";

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
};

export const drawRoute = (
  route: Route,
  map: mapboxgl.Map,
  end: Coordinates
) => {
  const geojson = {
    type: "Feature" as const,
    geometry: route.geometry,
    properties: {},
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
    new mapboxgl.Marker().setLngLat([end.longitude, end.latitude]).addTo(map);
  }
};

// Update the route based on the current location without hitting the API again
// This is used to update the route on the map as the user moves
export const updateRoute = (
  route: Route | null,
  location: Coordinates | undefined
): Route | null => {
  if (!location || !route) return route;

  // Find the closest point on the route to the current location
  // Used to update the map UI
  const coords = route.geometry.coordinates;
  const coordIdx = findClosestIndex(coords, location);
  const slicedCoords = coords.slice(coordIdx);

  // Find the closest step to the current location on the route
  const steps = route.legs[0].steps;
  const closestStepIndex = findClosestIndex(
    steps.map(
      (s) =>
        [s.maneuver.location[0], s.maneuver.location[1]] as GeoJSON.Position
    ),
    location
  );
  const remainingSteps = steps.slice(closestStepIndex);

  const remainingRoute: Route = {
    ...route,
    geometry: {
      type: "LineString",
      coordinates: slicedCoords,
    },
    start_location: location,
    legs: [
      {
        ...route.legs[0],
        steps: remainingSteps,
        distance: remainingSteps.reduce((a, b) => a + b.distance, 0),
        duration: remainingSteps.reduce((a, b) => a + b.duration, 0),
      },
    ],
  };

  return remainingRoute;
};

// Find the closest index in an array of coordinates to a given position
// using Haversine distance
export const findClosestIndex = (coords: Position[], position: Coordinates) => {
  let minDist = Infinity;
  let closestIndex = 0;

  coords.forEach(([lng, lat], i) => {
    const dist = haversine(lat, lng, position.latitude, position.longitude);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  });

  return closestIndex;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversine = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
