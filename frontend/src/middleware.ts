import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authApi } from "../lib/axios/authAPI";

// Checking subscription status directly from the backend 
const checkSubscriptionStatus = async (userId: string, accessToken: string): Promise<string> => {
  try {
    const baseURL = process.env.SERVER_INTERNAL_URI || "http://backend:8080";
    const res = await fetch(`${baseURL}/api/users/subscription-status/${userId}`, {
      method: "GET", 
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      }
    });

    if (!res.ok) {
      console.error("Failed to fetch subscription status:", res.statusText);
      return "unknown";
    }

    const data = await res.json();
    return data.subscriptionStatus ?? "unknown";
    
  } catch (error) {
    console.error("Error checking subscriptions tatus from the middleware:", error);
    return "unknown"
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isPublic = ["/", "/signup"].includes(pathname); // Also blocked for already signed in users
  const requiresSubscription = ["/home", "/group"].includes(pathname);
  const requiresAuth = ["/account", "/account/subscribe"].includes(pathname);

  // Not logged in and trying to access non-public routes
  if (!token && (requiresSubscription || requiresAuth)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check token's validity on the backend
  if (token?.accessToken) {
    const validationResult = await authApi.validateTokenServer(
      token.accessToken as string,
    );

    if (!validationResult.valid) {
      console.log(
        "Token invalid, redirecting to login:",
        validationResult.error,
      );
      const response = NextResponse.redirect(new URL("/", req.url));
      response.cookies.delete("next-auth.session-token");
      response.cookies.delete("next-auth.csrf-token");
      return response;
    }
  }

  // Logged in users trying to visit public pages
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // Not subscribed and trying to access subscription-only routes
  if (token && requiresSubscription) {
    const subscriptionStatus = await checkSubscriptionStatus(token.id as string, token.accessToken as string);
    if (subscriptionStatus !== "active") {
      return NextResponse.redirect(new URL("/account/subscribe", req.url));
    }     
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
