import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const { name, slug, imageUrl } = body as Record<string, unknown>;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return apiError("Category not found", 404);

  if (slug && slug !== existing.slug) {
    const conflict = await prisma.category.findUnique({ where: { slug: slug as string } });
    if (conflict) return apiError("Slug already in use", 409);
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: (name as string).trim() }),
      ...(slug !== undefined && { slug: (slug as string).trim() }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl as string | null }),
    },
  });

  return Response.json({ category });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return apiError("Category not found", 404);
  if (existing._count.products > 0) {
    return apiError(`Cannot delete — ${existing._count.products} product(s) still use this category`, 409);
  }

  await prisma.category.delete({ where: { id } });
  return Response.json({ ok: true });
}
