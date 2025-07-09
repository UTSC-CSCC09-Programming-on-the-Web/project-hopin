import { Coordinates } from "./location";

// Sample User Type (update when API is available)
export type User = {
  id: string;
  email?: string;
  // Exclude password for security reasons
  name?: string;
  avatar?: string;
  location?: Coordinates;
  destination?: Coordinates; // Where the user is going (if known)
  isReady?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Group = {
  id: string;
  owner: User | null;
  driver: User | null;
  members: User[];
  createdAt?: Date;
  updatedAt?: Date;
};
