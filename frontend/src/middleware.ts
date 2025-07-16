import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET});

  const isPublic = ["/", "/signup"].includes(pathname); // Also blocked for already signed in users
  const requiresSubscription = ["/home", "/group"].includes(pathname); 
  const requiresAuth = ["/account", "/subscribe"].includes(pathname);

  // Not logged in and trying to access non-public routes
  if (!token && (requiresSubscription || requiresAuth)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check token's validity on the backend
  if (token?.accessToken) {
    try {
      const res = await fetch("http://backend:8080/api/auth/validate-token", {
        method: "POST", 
        headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
        }
      });
      const result = await res.json();
      if (!result.valid) {
        console.log("Token invalid, redirecting to login");
        const response = NextResponse.redirect(new URL("/", req.url));
        response.cookies.delete("next-auth.session-token");
        response.cookies.delete("next-auth.csrf-token");
        return response;
      }
    } catch (error) {
        console.error("Token validation error:", error);
    }
  }

  // Logged in users trying to visit public pages
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // Not subscribed and trying to access subscription-only routes
  if (token && requiresSubscription && !token.isSubscribed) {
    return NextResponse.redirect(new URL("/subscribe", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
