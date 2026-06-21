import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { apiError } from "@/lib/validation";

export interface AuthContext {
  userId: string;
  role: string;
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
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return apiError("Unauthorized", 401);

  try {
    const payload = verifyAccessToken(header.slice(7));
    return { userId: payload.sub, role: payload.role };
  } catch {
    return apiError("Unauthorized", 401);
  }
}

export function requireAdmin(req: NextRequest): AuthContext | Response {
  const result = requireAuth(req);
  if (result instanceof Response) return result;
  if (result.role !== "admin") return apiError("Forbidden", 403);
  return result;
}
