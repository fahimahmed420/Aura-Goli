/**
 * Courier automation orchestrator.
 *
 * evaluateOrder(orderId)  — the "bot": assess COD risk, record the verdict,
 *                           and auto-dispatch to the default courier when the
 *                           customer looks trustworthy (or the order is prepaid).
 * dispatchOrder(orderId, courier) — create the consignment (used by both the
 *                           bot and the admin's manual "Send to courier" button).
 *
 * Env:
 *   DEFAULT_COURIER=steadfast|pathao      (default steadfast)
 *   COURIER_AUTO_DISPATCH=true|false      (default true — bot sends "good"/"prepaid")
 *   COURIER_AUTO_DISPATCH_NEUTRAL=true|false (default false — hold new customers for review)
 */

import { prisma } from "@/lib/prisma";
import { sendOrderStatusUpdate } from "@/lib/email";
import { sendOrderStatusSms } from "@/lib/sms";
import type { CourierId, DispatchResult, ParcelInput } from "./types";
import { steadfastCreateOrder, steadfastConfigured } from "./steadfast";
import { pathaoCreateOrder, pathaoConfigured } from "./pathao";
import { assessCodRisk, normalizeBdPhone } from "./risk";

export const COURIER_LABELS: Record<CourierId, string> = {
  steadfast: "Steadfast",
  pathao: "Pathao",
};

export function configuredCouriers(): CourierId[] {
  const out: CourierId[] = [];
  if (steadfastConfigured()) out.push("steadfast");
  if (pathaoConfigured()) out.push("pathao");
  return out;
}

function defaultCourier(): CourierId {
  const pref = (process.env.DEFAULT_COURIER ?? "steadfast") as CourierId;
  const available = configuredCouriers();
  if (available.includes(pref)) return pref;
  return available[0] ?? pref;
}

async function buildParcel(orderId: string): Promise<ParcelInput | { error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productNameSnapshot: true, quantity: true } } },
  });
  if (!order) return { error: "Order not found" };

  const addr = order.shippingAddress as { name?: string; phone?: string; address?: string; city?: string } | null;
  if (!addr?.name || !addr?.phone || !addr?.address) return { error: "Order is missing shipping details" };

  const itemQuantity = order.items.reduce((s, i) => s + i.quantity, 0);
  const description = order.items.map((i) => `${i.productNameSnapshot} x${i.quantity}`).join(", ");

  return {
    invoice: order.orderNumber,
    recipientName: addr.name,
    recipientPhone: normalizeBdPhone(addr.phone),
    recipientAddress: addr.address,
    recipientCity: addr.city ?? "Dhaka",
    // Collect at the door only for unpaid COD orders.
    codAmount: order.paymentMethod === "cod" && order.paymentStatus !== "paid" ? Math.round(Number(order.total)) : 0,
    itemQuantity,
    itemDescription: description,
    note: order.isGift ? "Gift order — premium packaging" : undefined,
  };
}

/** Create the consignment with the given courier and persist the outcome. */
export async function dispatchOrder(orderId: string, courier: CourierId, auto = false): Promise<DispatchResult> {
  const parcel = await buildParcel(orderId);
  if ("error" in parcel) {
    await prisma.courierDispatch.updateMany({ where: { orderId }, data: { lastError: parcel.error } });
    return { ok: false, courier, error: parcel.error };
  }

  const result = courier === "pathao" ? await pathaoCreateOrder(parcel) : await steadfastCreateOrder(parcel);

  if (!result.ok) {
    await prisma.courierDispatch.updateMany({ where: { orderId }, data: { lastError: result.error ?? "Dispatch failed" } });
    return result;
  }

  await prisma.$transaction(async (tx) => {
    await tx.courierDispatch.update({
      where: { orderId },
      data: {
        courier,
        consignmentId: result.consignmentId,
        trackingCode: result.trackingCode,
        courierStatus: result.status,
        autoDispatch: auto,
        lastError: null,
      },
    });
    // Surface courier + tracking on the order — this is what the customer
    // tracking page and the "shipped" validation read.
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        courierName: COURIER_LABELS[courier],
        trackingNumber: result.trackingCode ?? result.consignmentId,
        ...(auto && { status: "packed" }),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: auto ? "packed" : order.status,
        note: `${auto ? "Auto-dispatched" : "Dispatched"} to ${COURIER_LABELS[courier]} — consignment ${result.consignmentId}`,
      },
    });
  });

  return result;
}

/**
 * The bot. Runs after an order is confirmed (COD) or paid (online).
 * Never throws — checkout must not fail because of courier automation.
 */
export async function evaluateOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, guestEmail: true, paymentStatus: true, shippingAddress: true, status: true, orderNumber: true },
    });
    if (!order) return;
    if (["cancelled", "refunded", "delivered", "shipped"].includes(order.status)) return;

    // One evaluation per order — re-running is a no-op.
    const existing = await prisma.courierDispatch.findUnique({ where: { orderId } });
    if (existing) return;

    const risk = await assessCodRisk(order);
    await prisma.courierDispatch.create({
      data: {
        orderId,
        riskVerdict: risk.verdict,
        riskDetails: {
          reason: risk.reason,
          deliveredCount: risk.deliveredCount,
          cancelledCount: risk.cancelledCount,
          source: risk.source,
        },
      },
    });

    const autoEnabled = (process.env.COURIER_AUTO_DISPATCH ?? "true") === "true";
    const autoNeutral = process.env.COURIER_AUTO_DISPATCH_NEUTRAL === "true";
    const shouldAuto =
      autoEnabled &&
      (risk.verdict === "good" || risk.verdict === "prepaid" || (risk.verdict === "neutral" && autoNeutral));

    if (!shouldAuto) return;

    const available = configuredCouriers();
    if (available.length === 0) {
      await prisma.courierDispatch.update({
        where: { orderId },
        data: { lastError: "No courier API configured — add Steadfast/Pathao keys to enable auto-dispatch" },
      });
      return;
    }

    const result = await dispatchOrder(orderId, defaultCourier(), true);
    if (result.ok) {
      const addr = order.shippingAddress as { email?: string; phone?: string } | null;
      const email = order.guestEmail ?? addr?.email;
      if (email) sendOrderStatusUpdate(email, order.orderNumber, "packed").catch(console.error);
      if (addr?.phone) sendOrderStatusSms(addr.phone, order.orderNumber, "packed").catch(console.error);
    }
  } catch (err) {
    console.error("[courier-bot]", err);
  }
}
