import { prisma } from "@/lib/prisma";

const productCardSelect = {
  id: true, name: true, slug: true, price: true, compareAtPrice: true,
  createdAt: true, salesCount: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
  variants: { select: { color: true, size: true, stockQuantity: true } },
  _count: { select: { reviews: true } },
};

export async function GET() {
  const [bestsellers, newArrivals] = await Promise.all([
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { salesCount: "desc" },
      take: 8,
      select: productCardSelect,
    }),
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: productCardSelect,
    }),
  ]);

  return Response.json({ bestsellers, newArrivals });
}
