import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTokenPayload } from "@/lib/require-auth";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await rateLimit(`order-lookup:${ip}`, { limit: 20, windowSecs: 60 });
  if (!rl.allowed) return apiError("Too many requests. Please wait.", 429);

  const { orderNumber } = await params;

  // Resolve identity: logged-in user (header or HttpOnly cookie) OR email query param for guests
  const tokenPayload = resolveTokenPayload(req);
  const userId = tokenPayload?.sub ?? null;
  const userEmail = tokenPayload?.email?.toLowerCase() ?? null;
  const guestEmail = req.nextUrl.searchParams.get("email")?.toLowerCase() ?? null;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true, status: true, paymentStatus: true,
      total: true, shippingFee: true, discount: true, subtotal: true,
      createdAt: true, trackingNumber: true, courierName: true,
      shippingAddress: true,
      userId: true,
      guestEmail: true,
      user: { select: { email: true } },
      items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true } },
      statusHistory: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return apiError("Order not found", 404);

  // Auth check: must be the owner (logged-in) or provide the correct order email
  const addr = order.shippingAddress as { email?: string } | null;
  const orderEmail = (order.guestEmail ?? order.user?.email ?? addr?.email ?? "").toLowerCase();
  const isOwner = userId !== null && order.userId === userId;
  const ownsGuestOrder = !order.userId && !!userEmail && userEmail === orderEmail;

  if (!isOwner && !ownsGuestOrder) {
    if (!guestEmail) return apiError("Provide your email to track this order", 403);
    if (!orderEmail || orderEmail !== guestEmail) return apiError("Email does not match this order", 403);
  }

  const { userId: _uid, guestEmail: _gm, user: _usr, ...safeOrder } = order;
  return Response.json({ order: safeOrder });
}
