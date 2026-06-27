import { NextRequest } from "next/server";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth";
import { ACCESS_COOKIE } from "@/lib/cookies";
import { apiError } from "@/lib/validation";

export interface AuthContext {
  userId: string;
  role: string;
}

/**
 * Resolves a verified token payload from the request, trying the Authorization
 * header first (used by the separate admin-token flow), then the HttpOnly
 * access cookie (the storefront session). Returns null if neither verifies.
 */
export function resolveTokenPayload(req: NextRequest): AccessTokenPayload | null {
  const header = req.headers.get("authorization");
  const headerToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies.get(ACCESS_COOKIE)?.value ?? null;

  for (const candidate of [headerToken, cookieToken]) {
    if (!candidate) continue;
    try {
      return verifyAccessToken(candidate);
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/**
 * Extracts and verifies the caller's identity from the Authorization header.
 * Returns an AuthContext on success or a 401/403 Response on failure.
 *
 * Usage in a route handler:
 *   const auth = requireAuth(req);
 *   if (auth instanceof Response) return auth;
 *   // auth.userId, auth.role are safe to use
 */
export function requireAuth(req: NextRequest): AuthContext | Response {
  const payload = resolveTokenPayload(req);
  if (!payload) return apiError("Unauthorized", 401);
  return { userId: payload.sub, role: payload.role };
}

export function requireAdmin(req: NextRequest): AuthContext | Response {
  const result = requireAuth(req);
  if (result instanceof Response) return result;
  if (result.role !== "admin") return apiError("Forbidden", 403);
  return result;
}
