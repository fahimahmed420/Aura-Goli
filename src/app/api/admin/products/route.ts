import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { buildCatalogWhere, buildCatalogOrderBy, type CatalogSort } from "@/lib/catalog-query";
import { apiError } from "@/lib/validation";

// Allow larger bodies for base64 image uploads
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10)));
  const sort = (sp.get("sort") ?? "newest") as CatalogSort;
  const status = sp.get("status"); // "active" | "draft" | undefined (all)
  const lowStock = sp.get("lowStock") === "true";
  const threshold = parseInt(sp.get("threshold") ?? "5", 10);

  const where = buildCatalogWhere(
    {
      category: sp.get("category") ?? undefined,
      search: sp.get("q") ?? undefined,
    },
    true // includesDrafts
  );

  if (status === "active" || status === "draft") where.status = status;
  if (lowStock) {
    where.variants = { some: { stockQuantity: { lte: threshold } } };
  }

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: buildCatalogOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, slug: true, price: true, compareAtPrice: true,
        status: true, salesCount: true, createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { id: true, color: true, size: true, sku: true, stockQuantity: true } },
        _count: { select: { reviews: true } },
      },
    }),
  ]);

  return Response.json({ products, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const {
    name, slug, description, categoryId, price, compareAtPrice,
    status = "draft", images = [], variants = [],
    material, careInstructions, tags = [],
  } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) return apiError("Product name is required");
  if (typeof slug !== "string" || !slug.trim()) return apiError("Slug is required");
  if (typeof description !== "string") return apiError("Description is required");
  if (typeof categoryId !== "string") return apiError("Category is required");
  if (typeof price !== "number" || price < 0) return apiError("Valid price is required");
  if (!Array.isArray(variants) || variants.length === 0) return apiError("At least one variant is required");

  const slugExists = await prisma.product.findUnique({ where: { slug } });
  if (slugExists) return apiError("A product with this slug already exists", 409);

  const product = await prisma.product.create({
    data: {
      name: (name as string).trim(),
      slug: (slug as string).trim(),
      description: description as string,
      categoryId: categoryId as string,
      price: price as number,
      compareAtPrice: typeof compareAtPrice === "number" ? compareAtPrice : null,
      status: status === "active" ? "active" : "draft",
      material: typeof material === "string" ? material : null,
      careInstructions: typeof careInstructions === "string" ? careInstructions : null,
      tags: Array.isArray(tags) ? tags : [],
      images: {
        create: (images as { url: string; altText?: string; sortOrder?: number }[]).map(
          (img, i) => ({ url: img.url, altText: img.altText ?? null, sortOrder: img.sortOrder ?? i })
        ),
      },
      variants: {
        create: (variants as { color: string; size: string; sku: string; stockQuantity?: number }[]).map(
          (v) => ({ color: v.color, size: v.size, sku: v.sku, stockQuantity: v.stockQuantity ?? 0 })
        ),
      },
    },
    include: { images: true, variants: true, category: true },
  });

  return Response.json({ product }, { status: 201 });
}
