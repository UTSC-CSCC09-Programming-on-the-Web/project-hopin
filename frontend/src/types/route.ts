import { Place } from "./location";
import { User } from "./user";

export type RouteCheckpoint = User | Place;

// The full route from start to end
export type MapBoxRoute = {
  geometry: GeoJSON.LineString; // The full route geometry (used to draw the path on the map)

  distance: number; // Total distance of the route (all legs) in meters
  duration: number; // Total duration of the route (all legs) in seconds
};

export type Route = MapBoxRoute & {
  checkpoints: Place[]; // List of checkpoints along the route
};
