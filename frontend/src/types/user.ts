import { Coordinates, Locatable, Place } from "./location";
import { Route } from "./route";

// Sample User Type (update when API is available)
export type User = Locatable & {
  email: string;
  avatar?: string;
  location?: Coordinates;
  destination?: Place; // Where the user is going (if known)
  subscriptionStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const isUser = (item: any): item is User => {
  return (
    item &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.email === "string" &&
    (item.destination === undefined ||
      (item.destination &&
        typeof item.destination.id === "string" &&
        typeof item.destination.name === "string"))
  );
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
