import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { prisma } from "@/lib/prisma";
import { productDetailSelect, computeAverageRating } from "@/lib/catalog-query";
import type { Metadata } from "next";

async function getProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "active" },
    select: productDetailSelect,
  });
  return product;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: `${product.name} — Aura Goli`,
    description: product.description ?? undefined,
    openGraph: { images: product.images?.[0] ? [{ url: (product.images[0] as { url: string }).url }] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  // Fetch related products
  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, status: "active", slug: { not: slug } },
    take: 4,
    orderBy: { salesCount: "desc" },
    select: {
      id: true, name: true, slug: true, price: true,
      images: { select: { url: true }, take: 1 },
    },
  });

  const approvedReviews = product.reviews.filter((r) => (r as typeof r & { isApproved?: boolean }).isApproved !== false);
  const avgRating = computeAverageRating(approvedReviews);
  const productWithAvg = { ...product, reviews: approvedReviews, averageRating: avgRating };

  return <ProductDetailClient product={JSON.parse(JSON.stringify(productWithAvg))} related={JSON.parse(JSON.stringify(related))} />;
}
