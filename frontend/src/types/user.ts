import { Coordinates, Locatable, Place } from "./location";
import { Route } from "./route";

// Sample User Type (update when API is available)
export type User = Locatable & {
  email: string;
  avatar?: string;
  location?: Coordinates;
  destination?: Coordinates; // Where the user is going (if known)
  subscriptionStatus?: string;
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
  route: Route | null;
};
