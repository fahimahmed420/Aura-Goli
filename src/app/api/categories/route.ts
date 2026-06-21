import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      _count: { select: { products: { where: { status: "active" } } } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json({ categories });
}
