import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// import { prisma } from "@/lib/prisma";
// import { session } from "@/lib/session";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// When testing, you need the user to be the test user we set up in google cloud

// Configure NextAuth
const authOption: NextAuthOptions = {
  session: {
    strategy: "jwt", // use this instead of sessions for easier time
  },
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // called when user signed in with google and redirected to our app
    async signIn({ profile }) {
      if (!profile?.email) {
        throw new Error("no profile");
      }
      // now check if in our database
      // if not, update into our database
      try {
        const res = await fetch("http://localhost:8080/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: profile.email, name: profile.name }),
        });
        if (!res.ok) {
          console.error("failed to upsert");
          return false;
        }
      } catch (err) {
        console.error("error in sign in", err);
        return false;
      }

      return true;
    },

    async jwt({ token, profile }) {
      if (profile?.email) {
        const res = await fetch(
          `http://localhost:8080/api/users/by-email?email=${profile.email}`
        );
        const user = await res.json();

        token.id = user.id;
      }
      return token;
    },
  },
};

const handler = NextAuth(authOption);
export { handler as GET, handler as POST };
