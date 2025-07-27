import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const BACKEND_URI = process.env.SERVER_INTERNAL_URI!;

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  // NOTE: Might have to delete __Secure- and __Host- prefix if not strictly over HTTPS
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      }
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 4, // 4 hours
      }
    } 
  },

  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // This function is called when a user tries to sign in with credentials
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
            id: user.id.toString(),
            accessToken: user.accessToken,
          };
        } catch (err: any) {
          console.error("Credentials login failed:", err);
          throw new Error(err.message || "Something went wrong during login.");
        }
      },
    }),

    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          // Call backend to upsert the user and get the generated JWT
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

          // Stash backend token and ID in account for jwt()
          account.id = user.id.toString();
          account.accessToken = user.accessToken;
        } catch (err) {
          console.error("Google sign-in error:", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // If the user object is available, the user used credentials login
      if (user) {
        token.id = user.id;
        token.accessToken = user.accessToken;
      }

      // For Google login, get token from account (not user)
      if (account?.provider === "google") {
        token.id = account.id;
        token.accessToken = account.accessToken;
        token.profilePicture = account.profilePicture || null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.userId = token.id as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
