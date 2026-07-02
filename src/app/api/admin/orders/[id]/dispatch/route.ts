import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";
import { dispatchOrder, evaluateOrder, configuredCouriers } from "@/lib/courier";
import type { CourierId } from "@/lib/courier/types";

/** Manually send an order to a courier from the admin order drawer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const courier = body.courier as CourierId;

  if (courier !== "steadfast" && courier !== "pathao") return apiError("Invalid courier", 400);
  if (!configuredCouriers().includes(courier)) {
    return apiError(`${courier} API credentials are not configured (.env)`, 400);
  }

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return apiError("Order not found", 404);
  if (["cancelled", "refunded", "delivered"].includes(order.status)) {
    return apiError(`Cannot dispatch a ${order.status} order`, 400);
  }

  // Ensure a dispatch/risk row exists (covers orders that predate the bot).
  let existing = await prisma.courierDispatch.findUnique({ where: { orderId: id } });
  if (!existing) {
    await evaluateOrder(id); // may itself auto-dispatch a trusted customer
    existing = await prisma.courierDispatch.findUnique({ where: { orderId: id } });
  }
  if (existing?.consignmentId) {
    return existing.courier === courier
      ? Response.json({ dispatch: existing })
      : apiError(`Already dispatched to ${existing.courier}`, 400);
  }

  const result = await dispatchOrder(id, courier, false);
  if (!result.ok) return apiError(result.error ?? "Dispatch failed", 502);

  const dispatch = await prisma.courierDispatch.findUnique({ where: { orderId: id } });
  return Response.json({ dispatch });
}
