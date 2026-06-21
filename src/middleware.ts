import { NextRequest, NextResponse } from "next/server";

// Middleware runs in Edge Runtime — cannot use Node.js modules (jsonwebtoken, crypto).
// JWT verification happens in individual API route handlers via requireAuth().
// This middleware only forwards a token presence header so route handlers can
// skip the Authorization header parse for x-user-id (set post-verify in handlers).

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes — forward auth header untouched; route handlers call requireAuth()
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // All other matched routes are client-rendered pages that gate themselves
  // (AdminShell, AccountLayout, CheckoutClient) — just pass through.
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/order-confirmed/:path*", "/admin/:path*", "/api/:path*"],
};
