import { NextRequest } from "next/server";

/**
 * Resolve the app's canonical origin for a server-side redirect/callback URL.
 *
 * Prefers `NEXT_PUBLIC_APP_URL` when it's explicitly configured (so a custom
 * domain or a specific canonical URL always wins). Falls back to the
 * *incoming request's own origin* rather than a hardcoded localhost default —
 * on Vercel this is always the real deployed domain, so OAuth callbacks and
 * other redirects self-correct even if the env var was never set in the
 * dashboard, instead of silently sending users back to localhost.
 */
export function resolveAppUrl(req: NextRequest): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  // Strip any trailing slash — callers append their own leading slash, and a
  // trailing slash here would produce a double slash (e.g. in the Google
  // OAuth redirect_uri), which Google rejects as a mismatch even though the
  // registered URI looks identical.
  return url.replace(/\/+$/, "");
}
