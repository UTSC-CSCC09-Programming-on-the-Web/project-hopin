import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    userId: string;
    accessToken: string;
    subscriptionStatus: string;
  }

  interface JWT {
    userId: string;
    accessToken: string;
    subscriptionStatus: string;
  }

  interface User {
    id: string;
    accessToken: string;
    subscriptionStatus: string;
  }
}
