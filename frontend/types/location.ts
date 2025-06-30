// Has location-related types
export type Coordinates = Record<"latitude" | "longitude", number>;

export type Place = {
  id: string;
  place_name: string;
  center: [number, number];
};

// The full route from start to end
export type Route = {
  start_location: Coordinates; // Where the route begins (could be user's current location)
  end_location: Coordinates; // Where the route ends (destination)

  geometry: GeoJSON.LineString; // The full route geometry (used to draw the path on the map)

  legs: Array<{
    steps: Array<{
      distance: number; // Distance of this step in meters
      duration: number; // Duration of this step in seconds
      maneuver: {
        instruction: string; // Instruction to display (e.g., "Turn right onto King St")
        location: [number, number]; // Location where this maneuver happens
        type: string; // Type of maneuver (e.g., "turn", "merge", "arrive")
      };
    }>;
    summary: string; // Short description of this leg (e.g., road names)
    distance: number; // Total distance for this leg in meters
    duration: number; // Total duration for this leg in seconds
  }>;

  distance: number; // Total distance of the route (all legs) in meters
  duration: number; // Total duration of the route (all legs) in seconds
};
