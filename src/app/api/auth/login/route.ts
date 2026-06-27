import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  signAccessToken,
  signRefreshToken,
  signRememberMeRefreshToken,
  refreshTokenExpiry,
  generateSecureToken,
} from "@/lib/auth";
import { setRefreshCookie, setAccessCookie } from "@/lib/cookies";
import { rateLimit, authRateLimits } from "@/lib/rate-limit";
import { isValidEmail, apiError } from "@/lib/validation";

const GENERIC_ERROR = "Invalid email or password";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`login:${ip}`, authRateLimits.login);
  if (!rl.allowed) return apiError("Too many login attempts. Please wait.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body");
  }

  const { email, password, rememberMe = false } = body as Record<string, unknown>;

  if (typeof email !== "string" || !isValidEmail(email)) return apiError(GENERIC_ERROR, 401);
  if (typeof password !== "string") return apiError(GENERIC_ERROR, 401);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Time-constant comparison path — always run verifyPassword to prevent timing attacks
  const passwordMatch = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "$2a$12$invalidhashpaddingtoconstanttime"); // dummy

  if (!user || !passwordMatch) return apiError(GENERIC_ERROR, 401);
  if (user.isBlocked) return apiError("Your account has been suspended. Please contact support.", 403);

  // Silently link any guest orders that used this email
  await prisma.order.updateMany({
    where: { guestEmail: user.email, userId: null },
    data: { userId: user.id },
  }).catch(() => {});

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const remember = rememberMe === true;
  const expiresAt = refreshTokenExpiry(remember);
  const rawRefreshToken = generateSecureToken();
  const signedRefreshToken = remember
    ? signRememberMeRefreshToken({ sub: user.id })
    : signRefreshToken({ sub: user.id });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: rawRefreshToken,
      expiresAt,
    },
  });

  await setRefreshCookie(rawRefreshToken, expiresAt);
  // Access token now lives in an HttpOnly cookie (not JS-readable) to prevent XSS theft.
  await setAccessCookie(accessToken);

  return Response.json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
}
