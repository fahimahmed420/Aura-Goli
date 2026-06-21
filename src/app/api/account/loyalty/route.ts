import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        loyaltyPoints: true,
        loyaltyTransactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, points: true, type: true, description: true, orderId: true, createdAt: true },
        },
      },
    });
    return Response.json({ points: user?.loyaltyPoints ?? 0, transactions: user?.loyaltyTransactions ?? [] });
  } catch {
    return Response.json({ points: 0, transactions: [] });
  }
}
