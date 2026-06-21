import { Prisma } from "@prisma/client";

export interface CatalogFilters {
  category?: string;   // category slug
  colors?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;  // 1–5
  search?: string;
}

export type CatalogSort =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "rating"
  | "best-selling";

export interface CatalogPagination {
  page: number;
  pageSize: number;
}

/** Build the Prisma `where` clause for public catalog queries (active products only). */
export function buildCatalogWhere(
  filters: CatalogFilters,
  includesDrafts = false
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (!includesDrafts) where.status = "active";

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.category) {
    where.category = { slug: filters.category };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
    };
  }

  // Variant-level filters (color AND size must be in stock for at least one variant)
  if (filters.colors?.length || filters.sizes?.length) {
    const variantWhere: Prisma.ProductVariantWhereInput = { stockQuantity: { gt: 0 } };
    if (filters.colors?.length) variantWhere.color = { in: filters.colors };
    if (filters.sizes?.length) variantWhere.size = { in: filters.sizes };
    where.variants = { some: variantWhere };
  }

  return where;
}

/** Build the Prisma `orderBy` for catalog sort. */
export function buildCatalogOrderBy(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "best-selling":
      return [{ salesCount: "desc" }];
    case "rating":
      // reviews._avg.rating desc — Prisma doesn't support ordering by relation aggregate directly,
      // so fall back to salesCount as a proxy; proper rating sort handled at query time via raw or post-sort
      return [{ salesCount: "desc" }, { createdAt: "desc" }];
    case "featured":
    default:
      return [{ salesCount: "desc" }, { createdAt: "desc" }];
  }
}

/** Standard product select for list views. */
export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  status: true,
  salesCount: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { url: true, altText: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
  variants: {
    select: { id: true, color: true, size: true, sku: true, stockQuantity: true },
  },
  _count: { select: { reviews: true } },
} satisfies Prisma.ProductSelect;

/** Full product select for detail views. */
export const productDetailSelect = {
  id: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAtPrice: true,
  status: true,
  salesCount: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, altText: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
  material: true,
  careInstructions: true,
  tags: true,
  variants: {
    select: { id: true, color: true, size: true, sku: true, stockQuantity: true, priceModifier: true },
  },
  reviews: {
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      photos: true,
      helpfulCount: true,
      isApproved: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
  _count: { select: { reviews: true } },
} satisfies Prisma.ProductSelect;

/** Compute average rating from a reviews array. */
export function computeAverageRating(reviews: { rating: number }[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}
