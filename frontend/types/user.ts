import { Coordinates } from "./location";

// Sample User Type (update when API is available)
export type User = {
  id: string;
  name: string;
  // TODO: Add profile picture when available
  // profilePicture?: string;
  location?: Coordinates;
  destination?: Coordinates; // Where the user is going (if known)
  isReady: boolean;
};

export type Group = {
  id: string;
  owner: User | null;
  driver: User | null;
  members: User[];
};
