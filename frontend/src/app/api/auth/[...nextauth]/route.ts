import NextAuth, { Account, Profile, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const BACKEND_URI = process.env.SERVER_INTERNAL_URI!;

const authOptions = {
  session: {
    strategy: "jwt" as const,
    maxAge: 60 * 60, // 1 hour session
  },

  cookies: {
    sessionToken: {
      // TODO: With HTTPS enabled, uncomment line 17, and comment out line 18
      // name: `__Secure-next-auth.session-token`,
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // TODO: Make sure secure flag is set to true when
        // HTTPS is enabled
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    },
    callbackUrl: {
      // TODO: With HTTPS enabled, uncomment line 30, and comment out line 32
      // name: `__Secure-next-auth.callback-url`,
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        // TODO: Make sure secure flag is set to true when
        // HTTPS is enabled
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      },
    },
    csrfToken: {
      // TODO: With HTTPS enabled, uncomment line 30, and comment out line 32
      // name: `__Host-next-auth.csrf-token`,
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // TODO: Make sure secure flag is set to true when
        // HTTPS is enabled
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 4, // 4 hours
      },
    },
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

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || "Failed to sign in");
          }

          const user = await res.json();

          return {
            id: user.id,
            email: credentials.email,
            accessToken: user.accessToken,
          };
        } catch (err: any) {
          console.error("Credentials login failed:", err);

          const e = err as { message?: string };
          throw new Error(e.message ?? "Something went wrong during login.");
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
      // On initial sign-in from credentials provider
      if (user && account?.provider === "credentials") {
        return {
          ...token,
          id: user.id,
          email: user.email || token.email,
          accessToken: user.accessToken,
        } as JWT;
      }

      // From GoogleProvider via signIn callback
      if (account?.provider === "google" && account.accessToken) {
        return {
          ...token,
          id: account.id,
          email: token.email, // Preserve email from profile
          accessToken: account.accessToken, // This should contain the backend token
        } as JWT;
      }

      // Return existing token for subsequent requests
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      // Ensure we have the required token data
      if (token.id && token.accessToken) {
        session.userId = token.id as string;
        session.accessToken = token.accessToken as string;
      } else {
        console.error("Missing token data:", {
          id: token.id,
          accessToken: !!token.accessToken,
        });
      }
      return session;
    },
  },
};

// @ts-expect-error - NextAuth types are inconsistent across versions
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
