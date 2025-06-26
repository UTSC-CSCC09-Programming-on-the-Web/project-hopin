import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// import { prisma } from "@/lib/prisma";
// import { session } from "@/lib/session";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// When testing, you need the user to be the test user we set up in google cloud

// Configure NextAuth
const authOption: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  // pages:{signIn: ''},
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text", placeholder: "Email" },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password",
        },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch("http://localhost:8080/api/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;
          const user = await res.json();
          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // called when user signed in with google and redirected to our app
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
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
      }
      return true;
    },

    async jwt({ token, profile, user }) {
      if (user) {
        token.id = user.id;
      }
      if (profile?.email && !token.id) {
        const res = await fetch(
          `http://localhost:8080/api/auth/by-email?email=${profile.email}`
        );
        const user = await res.json();
        console.log("setting session");
        console.log("setting token");
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log("setting session");
        session.user.id = token.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOption);
export { handler as GET, handler as POST };
