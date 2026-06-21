import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const categories = await prisma.category.findMany({
    select: {
      id: true, name: true, slug: true, imageUrl: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json({ categories });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("Invalid request body"); }

  const { name, slug, imageUrl } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) return apiError("Category name is required");
  if (typeof slug !== "string" || !slug.trim()) return apiError("Slug is required");

  const exists = await prisma.category.findUnique({ where: { slug: slug.trim() } });
  if (exists) return apiError("A category with this slug already exists", 409);

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      slug: slug.trim(),
      imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    },
  });

  return Response.json({ category }, { status: 201 });
}
