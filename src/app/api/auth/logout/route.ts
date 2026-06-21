import { getRefreshCookie, clearRefreshCookie } from "@/lib/cookies";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = await getRefreshCookie();

  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  await clearRefreshCookie();
  return Response.json({ ok: true });
}
