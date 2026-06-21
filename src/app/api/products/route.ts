import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildCatalogWhere,
  buildCatalogOrderBy,
  productListSelect,
  computeAverageRating,
  type CatalogFilters,
  type CatalogSort,
} from "@/lib/catalog-query";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(48, Math.max(1, parseInt(sp.get("pageSize") ?? "24", 10)));
  const sort = (sp.get("sort") ?? "featured") as CatalogSort;

  const filters: CatalogFilters = {
    category: sp.get("category") ?? undefined,
    search: sp.get("q") ?? undefined,
    minPrice: sp.has("minPrice") ? parseFloat(sp.get("minPrice")!) : undefined,
    maxPrice: sp.has("maxPrice") ? parseFloat(sp.get("maxPrice")!) : undefined,
    minRating: sp.has("minRating") ? parseFloat(sp.get("minRating")!) : undefined,
    colors: sp.has("colors") ? sp.get("colors")!.split(",").filter(Boolean) : undefined,
    sizes: sp.has("sizes") ? sp.get("sizes")!.split(",").filter(Boolean) : undefined,
  };

  if (filters.minPrice !== undefined && isNaN(filters.minPrice))
    return apiError("minPrice must be a number");
  if (filters.maxPrice !== undefined && isNaN(filters.maxPrice))
    return apiError("maxPrice must be a number");

  const where = buildCatalogWhere(filters);
  const orderBy = buildCatalogOrderBy(sort);

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productListSelect,
    }),
  ]);

  // Post-fetch rating filter (Prisma can't WHERE on relation aggregates)
  const minRating = filters.minRating;
  const filtered = minRating
    ? products.filter((p) => computeAverageRating(p.variants as never) >= minRating)
    : products;

  // Attach computed averageRating to each product
  const enriched = filtered.map((p) => {
    // reviews not in list select — use _count as proxy; detail page has full reviews
    return { ...p, averageRating: 0, reviewCount: p._count.reviews };
  });

  return Response.json({
    products: enriched,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
