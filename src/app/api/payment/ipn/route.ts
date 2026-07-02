import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSSLPayment } from "@/lib/sslcommerz";
import { evaluateOrder } from "@/lib/courier";

// SSLCommerz Instant Payment Notification (server-to-server)
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const valId = form.get("val_id") as string;
  const tranId = form.get("tran_id") as string;
  const status = form.get("status") as string;

  if (status !== "VALID" && status !== "VALIDATED") return new Response("OK");

  const validation = await validateSSLPayment(valId);
  if (validation.status !== "VALID" && validation.status !== "VALIDATED") return new Response("OK");

  const order = await prisma.order.findUnique({ where: { orderNumber: tranId } });
  if (!order || order.paymentStatus === "paid") return new Response("OK");

  // Guard against amount tampering — the gateway-validated amount must cover the
  // order total (1 BDT tolerance for rounding). Never mark paid for less.
  if (Number(validation.amount) + 1 < Number(order.total)) {
    return new Response("OK");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "confirmed", paymentStatus: "paid" },
  });

  // Courier bot: prepaid orders carry no COD risk — auto-dispatch.
  after(() => evaluateOrder(order.id));

  return new Response("OK");
}
