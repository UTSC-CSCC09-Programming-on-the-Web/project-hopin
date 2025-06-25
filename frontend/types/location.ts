// Has location-related types
export type Coordinates = Record<"latitude" | "longitude", number>;

export type Place = {
  id: string;
  place_name: string;
  center: [number, number];
};
