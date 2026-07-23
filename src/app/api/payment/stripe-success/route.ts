import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/order-fulfillment";

// Customer-facing redirect after Stripe Checkout. The webhook is the source
// of truth for marking orders paid; this route re-validates against Stripe
// directly so the order-confirmed page renders correctly even if the
// webhook hasn't landed yet (markOrderPaid is idempotent either way).
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return Response.redirect(new URL("/cart?error=invalid_response", appUrl));

  const session = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  const orderNumber = session?.client_reference_id ?? (session?.metadata?.orderNumber as string | undefined);
  if (!session || !orderNumber) return Response.redirect(new URL("/cart?error=invalid_response", appUrl));

  if (session.payment_status !== "paid") {
    return Response.redirect(new URL("/cart?error=payment_invalid", appUrl));
  }

  await markOrderPaid(orderNumber, "stripe", session.payment_intent as string ?? session.id);

  return Response.redirect(new URL(`/order-confirmed?order=${orderNumber}`, appUrl));
}
