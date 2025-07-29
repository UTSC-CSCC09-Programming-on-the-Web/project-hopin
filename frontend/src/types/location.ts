// Has location-related types
export type Coordinates = Record<"latitude" | "longitude", number>;

export type Locatable = {
  id: string;
  name: string;
  color: string; // Color to mark the location on the map
  location?: Coordinates;
};

export type Place = Locatable & {
  address?: string;
  location: Coordinates; // Required for places
};
