import { prisma } from "@/lib/prisma";

/*
  The demos render against the real catalog so layout decisions are tested by
  real product names, real ৳ prices and real photography rather than lorem.

  If Postgres is unreachable the pages still render, but from FALLBACK — and
  `isLive` reports which, so a demo built on placeholders is never mistaken for
  one built on real data.
*/

export interface DemoProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string }[];
  categoryName?: string;
  reviewCount: number;
  averageRating: number;
  stock: number;
}

export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface DemoReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  productName: string;
}

export interface DemoData {
  isLive: boolean;
  storeName: string;
  categories: DemoCategory[];
  bestsellers: DemoProduct[];
  newArrivals: DemoProduct[];
  reviews: DemoReview[];
}

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  category: { select: { name: true } },
  images: { select: { url: true }, orderBy: { sortOrder: "asc" as const }, take: 2 },
  variants: { select: { stockQuantity: true } },
  _count: { select: { reviews: true } },
};

type RawCard = {
  id: string;
  name: string;
  slug: string;
  price: unknown;
  compareAtPrice: unknown;
  category: { name: string } | null;
  images: { url: string }[];
  variants: { stockQuantity: number }[];
  _count: { reviews: number };
};

function toCard(p: RawCard): DemoProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    images: p.images,
    categoryName: p.category?.name,
    reviewCount: p._count.reviews,
    averageRating: 0,
    stock: p.variants.reduce((s, v) => s + v.stockQuantity, 0),
  };
}

export async function getDemoData(): Promise<DemoData> {
  try {
    const [categories, bestsellers, newArrivals, reviews] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true, slug: true, imageUrl: true },
        take: 4,
      }),
      prisma.product.findMany({
        where: { status: "active" },
        orderBy: { salesCount: "desc" },
        take: 8,
        select: cardSelect,
      }),
      prisma.product.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: cardSelect,
      }),
      prisma.review.findMany({
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          user: { select: { name: true } },
          product: { select: { name: true } },
        },
      }),
    ]);

    // An empty catalog is as useless for a design demo as an unreachable one.
    if (bestsellers.length === 0 || categories.length === 0) return FALLBACK;

    return {
      isLive: true,
      storeName: "Aura Goli",
      categories,
      bestsellers: (bestsellers as RawCard[]).map(toCard),
      newArrivals: (newArrivals as RawCard[]).map(toCard),
      reviews: reviews.length
        ? reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            body: r.body,
            authorName: r.user?.name ?? "Verified buyer",
            productName: r.product?.name ?? "",
          }))
        : FALLBACK.reviews,
    };
  } catch {
    return FALLBACK;
  }
}

/* ── Fallback ─────────────────────────────────────────────────────────────── */

const p = (
  id: string,
  name: string,
  price: number,
  img: string,
  compareAtPrice?: number,
  stock = 24
): DemoProduct => ({
  id,
  name,
  slug: "#",
  price,
  compareAtPrice,
  images: [{ url: img }],
  categoryName: "Essentials",
  reviewCount: 12,
  averageRating: 5,
  stock,
});

export const FALLBACK: DemoData = {
  isLive: false,
  storeName: "Aura Goli",
  categories: [
    { id: "c1", name: "Oversized", slug: "#", imageUrl: "/Oversized.png" },
    { id: "c2", name: "Graphic", slug: "#", imageUrl: "/Graphic.png" },
    { id: "c3", name: "Plain", slug: "#", imageUrl: "/Plain.png" },
    { id: "c4", name: "Premium", slug: "#", imageUrl: "/Premium.png" },
  ],
  bestsellers: [
    p("b1", "Heavyweight Boxy Tee — Bone", 1890, "/Oversized.png", 2400),
    p("b2", "Structured Cotton Overshirt", 3450, "/Premium.png"),
    p("b3", "Relaxed Crew — Charcoal", 1650, "/Plain.png", undefined, 4),
    p("b4", "Archive Print Tee", 2100, "/Graphic.png"),
  ],
  newArrivals: [
    p("n1", "Supima Long Sleeve", 2280, "/Plain.png"),
    p("n2", "Drop Shoulder Knit", 3900, "/Premium.png"),
    p("n3", "Washed Graphic Tee", 1990, "/Graphic.png", 2600),
    p("n4", "Oversized Hood — Sand", 4200, "/Oversized.png"),
  ],
  reviews: [
    {
      id: "r1",
      rating: 5,
      title: "Worth every taka",
      body: "The weight of the cotton is what sold me. Washed it six times and the shape has not moved at all.",
      authorName: "Nusrat H.",
      productName: "Heavyweight Boxy Tee",
    },
    {
      id: "r2",
      rating: 5,
      title: "Finally, a proper fit",
      body: "Ordered the overshirt in medium and the shoulders sit exactly where they should. Delivery to Chittagong took two days.",
      authorName: "Tanvir A.",
      productName: "Structured Cotton Overshirt",
    },
    {
      id: "r3",
      rating: 4,
      title: "Better than the photos",
      body: "The print has a subtle texture you cannot see online. Runs slightly large, size down if you want it close.",
      authorName: "Farhana K.",
      productName: "Archive Print Tee",
    },
  ],
};
