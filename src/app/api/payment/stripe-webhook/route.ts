import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/order-fulfillment";
import Stripe from "stripe";

// Server-to-server confirmation from Stripe — the source of truth for
// payment state, independent of whether the customer's browser ever
// returns to /api/payment/stripe-success.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Webhook not configured", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber = session.client_reference_id ?? (session.metadata?.orderNumber as string | undefined);
    if (orderNumber && session.payment_status === "paid") {
      await markOrderPaid(orderNumber, "stripe", (session.payment_intent as string) ?? session.id);
    }
  }

  return new Response("OK");
}
