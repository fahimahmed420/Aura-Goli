import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { referralCode: true },
    });

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const referredCount = user.referralCode
      ? await prisma.user.count({ where: { referredBy: user.referralCode } })
      : 0;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const referralUrl = user.referralCode
      ? `${appUrl}/join?ref=${user.referralCode}`
      : null;

    return Response.json({ referralCode: user.referralCode ?? null, referredCount, referralUrl });
  } catch {
    return Response.json({ error: "Failed to load referral data" }, { status: 500 });
  }
}
