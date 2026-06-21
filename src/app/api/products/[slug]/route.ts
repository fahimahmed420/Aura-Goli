import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { productDetailSelect, computeAverageRating } from "@/lib/catalog-query";
import { apiError } from "@/lib/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, status: "active" },
    select: productDetailSelect,
  });

  if (!product) return apiError("Product not found", 404);

  const averageRating = computeAverageRating(product.reviews);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: product.reviews.filter((r) => r.rating === star).length,
  }));

  // Related products — same category, exclude current
  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, status: "active", slug: { not: slug } },
    select: {
      id: true, name: true, slug: true, price: true, compareAtPrice: true,
      images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { reviews: true } },
    },
    take: 8,
  });

  return Response.json({ product: { ...product, averageRating, ratingBreakdown }, related });
}
