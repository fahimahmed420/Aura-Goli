import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export interface StripeCheckoutParams {
  orderNumber: string;
  total: number;          // BDT
  customerEmail: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
}

// Stripe's smallest-currency-unit rule: BDT has no Stripe-recognized minor
// unit exponent, so amounts are sent as whole taka (matches how the rest of
// the app already treats BDT as an integer currency — see Prisma schema).
export async function createStripeCheckoutSession(params: StripeCheckoutParams) {
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    client_reference_id: params.orderNumber,
    line_items: [
      {
        price_data: {
          currency: "bdt",
          unit_amount: Math.round(params.total * 100),
          product_data: { name: params.productName },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { orderNumber: params.orderNumber },
  });
}
