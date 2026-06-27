import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { prisma } from "@/lib/prisma";
import { productDetailSelect, computeAverageRating } from "@/lib/catalog-query";
import type { Metadata } from "next";

// ISR: cache rendered product pages for 5 minutes; admin edits revalidate on demand.
export const revalidate = 300;

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
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — Aura Goli`,
      description: product.description ?? undefined,
      images: product.images?.[0] ? [{ url: (product.images[0] as { url: string }).url }] : [],
    },
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://auragoli.com";
  const images = (product.images as { url: string }[] | undefined)?.map((i) => i.url) ?? [];
  const inStock = product.variants?.some((v) => v.stockQuantity > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images,
    sku: product.variants?.[0]?.sku ?? product.id,
    brand: { "@type": "Brand", name: "Aura Goli" },
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/products/${slug}`,
      priceCurrency: "BDT",
      price: Number(product.price),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(avgRating > 0 && approvedReviews.length > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(avgRating.toFixed(1)), reviewCount: approvedReviews.length } }
      : {}),
  };

  const cat = product.category as { name: string; slug: string } | null;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${baseUrl}/shop` },
      ...(cat ? [{ "@type": "ListItem", position: 3, name: cat.name, item: `${baseUrl}/shop?category=${cat.slug}` }] : []),
      { "@type": "ListItem", position: cat ? 4 : 3, name: product.name, item: `${baseUrl}/products/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProductDetailClient product={JSON.parse(JSON.stringify(productWithAvg))} related={JSON.parse(JSON.stringify(related))} />
    </>
  );
}
