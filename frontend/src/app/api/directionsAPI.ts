import { Coordinates, Route } from "../../../types/location";

export const fetchMapboxDirections = async (
  start: Coordinates,
  end: Coordinates
): Promise<Route> => {
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?steps=true&geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
  );

  if (!res.ok) throw new Error("Failed to fetch directions");

  const data = await res.json();

  if (!data?.routes?.length) throw new Error("No route found");

  return data.routes[0];
};
