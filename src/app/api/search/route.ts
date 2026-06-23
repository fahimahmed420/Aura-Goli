import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return apiError("Search query must be at least 2 characters");

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const pageSize = 24;

  const where = {
    status: "active" as const,
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { category: { name: { contains: q, mode: "insensitive" as const } } },
    ],
  };

  // Independent reads — Promise.all avoids the 5s interactive-transaction cap
  // that made cold first requests fail (see api/products/route.ts).
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, name: true, slug: true, price: true, compareAtPrice: true,
        category: { select: { name: true, slug: true } },
        images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { color: true, size: true, stockQuantity: true } },
        _count: { select: { reviews: true } },
      },
    }),
  ]);

  return Response.json({
    query: q,
    products,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
