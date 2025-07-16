import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import path from "path";

export async function middleware(req: NextRequest) {
  
  const { pathname } = req.nextUrl;

  const publicRoutes = [
    "/",
    "/signup",
    "/subscribe"
  ]

  const subscriptionRoutes = [
    "/home",
    "/group"
  ];

  const authOnlyRoutes = [
    "/account",
  ];

  // Skip for public paths
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET});
  

  // Not logged in and trying to access non-public routes
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Logged in but not subscribed
  if (token && subscriptionRoutes.includes(pathname)) {
    if (!token.isSubscribed) {
      return NextResponse.redirect(new URL("/subscribe", req.url));
    }
  }

  console.log("Where am I?", pathname, token);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
