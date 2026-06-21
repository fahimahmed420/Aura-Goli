import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns available filter options for the shop sidebar:
 * distinct colors, sizes, and price range — scoped to a category if provided.
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const categoryWhere = category ? { category: { slug: category } } : {};

  const [variants, priceRange] = await Promise.all([
    prisma.productVariant.findMany({
      where: { product: { status: "active", ...categoryWhere }, stockQuantity: { gt: 0 } },
      select: { color: true, size: true },
      distinct: ["color", "size"],
    }),
    prisma.product.aggregate({
      where: { status: "active", ...categoryWhere },
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  const colors = [...new Set(variants.map((v) => v.color))].sort();
  const sizes = [...new Set(variants.map((v) => v.size))].sort();

  return Response.json({
    colors,
    sizes,
    priceRange: {
      min: priceRange._min.price ? Number(priceRange._min.price) : 0,
      max: priceRange._max.price ? Number(priceRange._max.price) : 0,
    },
  });
}
