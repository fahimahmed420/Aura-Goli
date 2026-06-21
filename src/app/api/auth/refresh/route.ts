import { getRefreshCookie, setRefreshCookie, clearRefreshCookie } from "@/lib/cookies";
import { prisma } from "@/lib/prisma";
import { signAccessToken, generateSecureToken, refreshTokenExpiry } from "@/lib/auth";
import { apiError } from "@/lib/validation";

export async function POST() {
  const rawToken = await getRefreshCookie();
  if (!rawToken) return apiError("No refresh token", 401);

  const stored = await prisma.refreshToken.findUnique({ where: { token: rawToken } });
  if (!stored || stored.expiresAt < new Date()) {
    await clearRefreshCookie();
    return apiError("Session expired. Please log in again.", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.isBlocked) {
    await clearRefreshCookie();
    return apiError("Account not found or suspended.", 401);
  }

  // Rotate refresh token
  const newRawToken = generateSecureToken();
  const expiresAt = refreshTokenExpiry();

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: stored.id } }),
    prisma.refreshToken.create({
      data: { userId: user.id, token: newRawToken, expiresAt },
    }),
  ]);

  await setRefreshCookie(newRawToken, expiresAt);

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return Response.json({ accessToken });
}
