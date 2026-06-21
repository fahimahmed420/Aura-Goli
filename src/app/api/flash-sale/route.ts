import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const sale = await prisma.flashSale.findFirst({
      where: { isActive: true, endsAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ sale: sale ?? null });
  } catch {
    return Response.json({ sale: null });
  }
}
