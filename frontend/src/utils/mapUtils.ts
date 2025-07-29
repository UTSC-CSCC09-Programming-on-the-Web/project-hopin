import { Coordinates } from "../types/location";
import { Position } from "geojson";

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
  lon2: number,
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
