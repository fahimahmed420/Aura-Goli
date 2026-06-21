import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signAccessToken, generateSecureToken, refreshTokenExpiry } from "@/lib/auth";
import { setRefreshCookie } from "@/lib/cookies";
import { rateLimit, authRateLimits } from "@/lib/rate-limit";
import { isValidEmail, apiError } from "@/lib/validation";

// Generic error — don't reveal whether the email exists or whether it's not an admin
const GENERIC_ERROR = "Invalid credentials";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`admin-login:${ip}`, authRateLimits.login);
  if (!rl.allowed) return apiError("Too many login attempts.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(GENERIC_ERROR, 401);
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isValidEmail(email)) return apiError(GENERIC_ERROR, 401);
  if (typeof password !== "string") return apiError(GENERIC_ERROR, 401);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  const passwordMatch = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "$2a$12$invalidhashpaddingtoconstanttime");

  // Must exist, match, AND be admin — same error for all failure modes
  if (!user || !passwordMatch || user.role !== "admin") return apiError(GENERIC_ERROR, 401);
  if (user.isBlocked) return apiError(GENERIC_ERROR, 401);

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const expiresAt = refreshTokenExpiry(false);
  const rawToken = generateSecureToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, token: rawToken, expiresAt },
  });

  await setRefreshCookie(rawToken, expiresAt);

  return Response.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
