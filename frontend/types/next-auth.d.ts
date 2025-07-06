import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    userId: string;
    accessToken: string;
  }

  interface JWT {
    userId: string;
    accessToken: string;
  }

  interface User {
    id: string;
    accessToken: string;
  }
}
