import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/validation";
import { sendOrderStatusUpdate } from "@/lib/email";
import { sendOrderStatusSms } from "@/lib/sms";
import { steadfastCheckStatus } from "@/lib/courier/steadfast";
import { pathaoCheckStatus } from "@/lib/courier/pathao";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Polls the courier for every open consignment and mirrors terminal outcomes
 * back onto the order: delivered → order delivered (COD marked paid),
 * cancelled/returned → order cancelled + stock restored. Non-terminal courier
 * statuses are just recorded for the admin panel.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError("Cron not configured", 503);

  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("secret");
  if (provided !== secret) return apiError("Forbidden", 403);

  const open = await prisma.courierDispatch.findMany({
    where: {
      consignmentId: { not: null },
      order: { status: { in: ["confirmed", "packed", "shipped"] } },
    },
    include: { order: { select: { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, guestEmail: true, shippingAddress: true, items: { select: { variantId: true, quantity: true } }, user: { select: { email: true } } } } },
    take: 100,
  });

  let checked = 0, updated = 0;
  for (const d of open) {
    const result = d.courier === "pathao"
      ? await pathaoCheckStatus(d.consignmentId!)
      : await steadfastCheckStatus(d.order.orderNumber);
    if (!result.ok) continue;
    checked++;

    if (result.status && result.status !== d.courierStatus) {
      await prisma.courierDispatch.update({ where: { id: d.id }, data: { courierStatus: result.status } });
    }
    if (!result.normalized) continue;

    const newStatus = result.normalized; // "delivered" | "cancelled"
    if (d.order.status === newStatus) continue;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: d.order.id },
        data: {
          status: newStatus,
          // COD cash is collected at the door — delivery makes it revenue.
          ...(newStatus === "delivered" && d.order.paymentMethod === "cod" && d.order.paymentStatus !== "paid" && { paymentStatus: "paid" }),
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: d.order.id, status: newStatus, note: `Courier (${d.courier}) reported: ${result.status}` },
      });
      if (newStatus === "cancelled") {
        for (const item of d.order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          }
        }
      }
    });
    updated++;

    const addr = d.order.shippingAddress as { email?: string; phone?: string } | null;
    const email = d.order.user?.email ?? d.order.guestEmail ?? addr?.email;
    if (email) sendOrderStatusUpdate(email, d.order.orderNumber, newStatus).catch(console.error);
    if (addr?.phone) sendOrderStatusSms(addr.phone, d.order.orderNumber, newStatus).catch(console.error);
  }

  return Response.json({ ok: true, open: open.length, checked, updated });
}

export const POST = run;
export const GET = run;
