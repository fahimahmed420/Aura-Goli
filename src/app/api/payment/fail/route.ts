import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const tranId = form.get("tran_id") as string;

  if (tranId) {
    const order = await prisma.order.findUnique({ where: { orderNumber: tranId } });
    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled", paymentStatus: "failed" },
      });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return Response.redirect(new URL(`/cart?error=payment_failed`, appUrl));
}
