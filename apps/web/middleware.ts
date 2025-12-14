import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Public routes that don't require authentication
        const publicRoutes = [
          "/api/invitations/accept", // GET endpoint for invitation details (unauthenticated preview)
          "/api/auth/register",
          "/api/auth", // NextAuth routes
        ];

        // Allow public routes without token
        if (publicRoutes.some(route => path.startsWith(route))) {
          return true;
        }

        // All other matched routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/market-desk/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/api/:path*",
  ],
};
