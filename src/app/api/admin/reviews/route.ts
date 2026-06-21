import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 20;
  const approved = searchParams.get("approved"); // "true" | "false" | null (all)

  const where = approved !== null ? { isApproved: approved === "true" } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, rating: true, title: true, body: true, isApproved: true, createdAt: true,
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return Response.json({ reviews, pagination: { total, page, pageSize } });
}
