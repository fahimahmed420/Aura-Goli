import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: true, category: true },
  });

  if (!product) return apiError("Product not found", 404);
  return Response.json({ product });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const {
    name, slug, description, categoryId, price, compareAtPrice,
    status, images, variants,
  } = body as Record<string, unknown>;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return apiError("Product not found", 404);

  if (slug && slug !== existing.slug) {
    const conflict = await prisma.product.findUnique({ where: { slug: slug as string } });
    if (conflict) return apiError("A product with this slug already exists", 409);
  }

  const product = await prisma.$transaction(async (tx) => {
    // Replace images if provided
    if (Array.isArray(images)) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await tx.productImage.createMany({
          data: (images as { url: string; altText?: string; sortOrder?: number }[]).map(
            (img, i) => ({ productId: id, url: img.url, altText: img.altText ?? null, sortOrder: img.sortOrder ?? i })
          ),
        });
      }
    }

    // Upsert variants if provided
    if (Array.isArray(variants)) {
      // Delete variants not in the new list (by SKU)
      const newSkus = (variants as { sku: string }[]).map((v) => v.sku);
      await tx.productVariant.deleteMany({ where: { productId: id, sku: { notIn: newSkus } } });

      for (const v of variants as { sku: string; color: string; size: string; stockQuantity?: number }[]) {
        await tx.productVariant.upsert({
          where: { sku: v.sku },
          update: { color: v.color, size: v.size, stockQuantity: v.stockQuantity ?? 0 },
          create: { productId: id, sku: v.sku, color: v.color, size: v.size, stockQuantity: v.stockQuantity ?? 0 },
        });
      }
    }

    return tx.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: (name as string).trim() }),
        ...(slug !== undefined && { slug: (slug as string).trim() }),
        ...(description !== undefined && { description: description as string }),
        ...(categoryId !== undefined && { categoryId: categoryId as string }),
        ...(price !== undefined && { price: price as number }),
        ...(compareAtPrice !== undefined && { compareAtPrice: compareAtPrice as number | null }),
        ...(status !== undefined && { status: status as "active" | "draft" }),
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, variants: true, category: true },
    });
  });

  return Response.json({ product });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return apiError("Product not found", 404);

  await prisma.product.delete({ where: { id } });
  return Response.json({ ok: true });
}
