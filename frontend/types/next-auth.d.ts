import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    userId: string;
    accessToken: string;
    isSubscribed: boolean;
  }

  interface JWT {
    userId: string;
    accessToken: string;
    isSubscribed: boolean;
  }

  interface User {
    id: string;
    accessToken: string;
    isSubscribed: boolean;
  }
}
