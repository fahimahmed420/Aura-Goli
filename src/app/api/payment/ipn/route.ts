import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSSLPayment } from "@/lib/sslcommerz";

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

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "confirmed", paymentStatus: "paid" },
  });

  return new Response("OK");
}
