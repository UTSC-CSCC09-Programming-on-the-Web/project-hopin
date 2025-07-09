import NextAuth, { Account, Profile, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const BACKEND_URI = process.env.SERVER_INTERNAL_URI!;

const authOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour session
  },

  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${BACKEND_URI}/api/auth/signin`, {
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
            email: credentials.email,
            accessToken: user.accessToken,
          };
        } catch (err) {
          console.error("Credentials login failed:", err);
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
    async signIn({
      account,
      profile,
    }: {
      account?: Account;
      profile?: Profile;
    }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          const res = await fetch(`${BACKEND_URI}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
            }),
          });

          if (!res.ok) throw new Error("Backend Google auth failed");

          const user = await res.json();

          // Store tokens in account object for jwt callback
          account.id = user.id.toString();
          account.accessToken = user.accessToken;
        } catch (err) {
          console.error("Google sign-in error:", err);
          return false;
        }
      }
      return true;
    },

    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: User;
      account?: Account;
    }) {
      // From GoogleProvider via signIn callback
      if (account?.provider === "google") {
        const result = {
          ...token,
          id: account.id,
          email: token.email, // Preserve email from profile
          accessToken: account.accessToken, // This should contain the backend token
        } as JWT;
        return result;
      }

      // On initial sign-in (credentials only - when no account provider)
      if (user && !account?.provider) {
        return {
          ...token,
          id: user.id,
          email: user.email || token.email,
          accessToken: user.accessToken,
        } as JWT;
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      session.userId = token.id as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};

// @ts-expect-error - NextAuth types are inconsistent across versions
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
