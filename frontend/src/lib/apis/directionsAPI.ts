import { Locatable, Place } from "@/types/location";
import { MapBoxRoute, Route } from "@/types/route";

export const fetchRoute = async (checkpoints: Locatable[]): Promise<Route> => {
  const checkpointsWithLocation = checkpoints.filter(
    (point) =>
      point.location && point.location.latitude && point.location.longitude
  );

  // Map the coordinates to a string format for the API
  const routeStr = checkpointsWithLocation
    .map((point) => `${point.location!.longitude},${point.location!.latitude}`)
    .join(";");

  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${routeStr}?steps=true&geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
  );

  if (!res.ok) throw new Error("Failed to fetch directions");
  let routeData = await res.json();
  if (!routeData?.routes?.length) throw new Error("No route found");
  routeData = routeData.routes[0] as MapBoxRoute;

  const createdRoute: Route = {
    ...routeData,
    checkpoints: checkpointsWithLocation.slice(1) as Place[],
  };

  return createdRoute;
};
