import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`order-lookup:${ip}`, { limit: 20, windowSecs: 60 });
  if (!rl.allowed) return apiError("Too many requests. Please wait.", 429);

  const { orderNumber } = await params;

  // Resolve identity: logged-in user OR email query param for guests
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try { userId = verifyAccessToken(authHeader.slice(7)).sub; } catch { /* guest */ }
  }
  const guestEmail = req.nextUrl.searchParams.get("email")?.toLowerCase() ?? null;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true, status: true, paymentStatus: true,
      total: true, shippingFee: true, discount: true, subtotal: true,
      createdAt: true, trackingNumber: true, courierName: true,
      shippingAddress: true,
      userId: true,
      items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true } },
      statusHistory: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return apiError("Order not found", 404);

  // Auth check: must be the owner (logged-in) or provide the correct guest email
  if (userId) {
    if (order.userId && order.userId !== userId) return apiError("Order not found", 404);
  } else {
    // Guest: require email match against shippingAddress
    if (!guestEmail) return apiError("Provide your email to track this order", 403);
    const addr = order.shippingAddress as { email?: string } | null;
    const orderEmail = (addr?.email ?? "").toLowerCase();
    if (!orderEmail || orderEmail !== guestEmail) return apiError("Email does not match this order", 403);
  }

  const { userId: _uid, ...safeOrder } = order;
  return Response.json({ order: safeOrder });
}
