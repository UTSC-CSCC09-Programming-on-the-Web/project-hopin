import { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      avatar?: string | null;
    }
  }
  interface User {
    id?: string;
    avatar?: string | null;
  }
}
