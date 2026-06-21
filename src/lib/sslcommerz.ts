/**
 * SSLCommerz payment gateway integration.
 * Docs: https://developer.sslcommerz.com/doc/v4/
 */

const BASE_URL = process.env.SSLCOMMERZ_SANDBOX === "true"
  ? "https://sandbox.sslcommerz.com"
  : "https://securepay.sslcommerz.com";

export interface SSLCommerzParams {
  orderNumber: string;
  total: number;           // BDT
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  productName: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface SSLCommerzResponse {
  status: string;
  GatewayPageURL?: string;
  sessionkey?: string;
  failedreason?: string;
}

export async function initiateSSLPayment(params: SSLCommerzParams): Promise<SSLCommerzResponse> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID!;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD!;

  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePass,
    total_amount: params.total.toFixed(2),
    currency: "BDT",
    tran_id: params.orderNumber,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    cus_name: params.customerName,
    cus_email: params.customerEmail,
    cus_phone: params.customerPhone,
    cus_add1: params.shippingAddress,
    cus_city: params.shippingCity,
    cus_country: "Bangladesh",
    shipping_method: "Courier",
    product_name: params.productName,
    product_category: "Clothing",
    product_profile: "general",
    num_of_item: "1",
    ship_name: params.customerName,
    ship_add1: params.shippingAddress,
    ship_city: params.shippingCity,
    ship_country: "Bangladesh",
  });

  const res = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, {
    method: "POST",
    body,
  });

  return res.json();
}

export async function validateSSLPayment(valId: string): Promise<{ status: string; amount: string; currency: string }> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID!;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD!;

  const url = `${BASE_URL}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePass}&format=json`;
  const res = await fetch(url);
  return res.json();
}
