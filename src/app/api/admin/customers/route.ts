import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const pageSize = Math.min(50, parseInt(sp.get("pageSize") ?? "20"));
  const q = sp.get("q") ?? undefined;

  const where: Record<string, unknown> = { role: "customer" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, isBlocked: true, createdAt: true,
        _count: { select: { orders: true } },
        orders: { select: { total: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return Response.json({ customers, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
