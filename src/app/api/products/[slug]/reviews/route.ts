import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiError, sanitizeText } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

// GET — public list of approved reviews for a product
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return apiError("Product not found", 404);

  const reviews = await prisma.review.findMany({
    where: { productId: product.id, isApproved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, rating: true, title: true, body: true, helpfulCount: true, createdAt: true,
      user: { select: { name: true } },
    },
  });

  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star, count: reviews.filter((r) => r.rating === star).length,
  }));

  return Response.json({ reviews, total, avg, dist });
}

// POST — authenticated user submits a review (must have delivered order for this product)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`review:${ip}`, { limit: 5, windowSecs: 300 });
  if (!rl.allowed) return apiError("Too many review submissions. Please wait.", 429);

  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const { slug } = await params;
  const body = await req.json();
  const { rating, title, body: reviewBody, orderId } = body;

  if (!rating || rating < 1 || rating > 5) return apiError("Rating must be 1–5", 400);
  if (!reviewBody?.trim()) return apiError("Review body is required", 400);

  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return apiError("Product not found", 404);

  // Verify the user bought this product in a delivered order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId ?? undefined,
      userId: auth.userId,
      status: "delivered",
      items: { some: { variant: { productId: product.id } } },
    },
    select: { id: true },
  });

  if (!order) return apiError("You can only review products from delivered orders", 403);

  // Prevent duplicate review per order
  const existing = await prisma.review.findFirst({
    where: { productId: product.id, userId: auth.userId, orderId: order.id },
  });
  if (existing) return apiError("You have already reviewed this product for this order", 409);

  const review = await prisma.review.create({
    data: {
      productId: product.id,
      userId: auth.userId,
      orderId: order.id,
      rating,
      title: title ? sanitizeText(title, 120) || null : null,
      body: sanitizeText(reviewBody, 1000),
      isApproved: true,
    },
  });

  return Response.json({ review }, { status: 201 });
}
