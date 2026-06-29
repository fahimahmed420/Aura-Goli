import type Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import {
  buildCatalogWhere,
  buildCatalogOrderBy,
  productListSelect,
  type CatalogSort,
} from "@/lib/catalog-query";

/**
 * Tools the chat assistant can call. The model decides *what* to ask for;
 * these executors decide *what is allowed to be returned* — in particular,
 * order lookups are always scoped to the authenticated user, so a customer
 * can never read another customer's order regardless of what the model passes.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aura-goli.vercel.app";

export interface ChatToolContext {
  /** Authenticated user id, or null for anonymous visitors. */
  userId: string | null;
}

export const chatTools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the Aura Goli catalog for live products. Use this whenever a customer asks about what's available, prices, colors, sizes, or stock. Returns real prices (in BDT), in-stock colors/sizes, and a product link.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Keyword to match against product name/description, e.g. 'graphic', 'oversized'." },
          category: { type: "string", description: "Category slug, e.g. 'oversized', 'graphic', 'premium', 'plain'." },
          colors: { type: "array", items: { type: "string" }, description: "Filter to these colors, e.g. ['Black','White']." },
          sizes: { type: "array", items: { type: "string" }, description: "Filter to these sizes, e.g. ['M','L','XL']." },
          minPrice: { type: "number", description: "Minimum price in BDT." },
          maxPrice: { type: "number", description: "Maximum price in BDT." },
          sort: {
            type: "string",
            enum: ["featured", "price-asc", "price-desc", "newest", "best-selling"],
            description: "Result ordering. Use 'price-asc' for cheapest, 'price-desc' for most expensive, 'newest' for latest arrivals.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_order",
      description:
        "Place a new order on behalf of the customer after collecting all required details. Only call this once you have: product name, color, size, customer name, phone number, full delivery address (division, district, area, street details), and payment method. Do NOT call this until every field is confirmed by the customer.",
      parameters: {
        type: "object",
        required: ["productName", "color", "size", "customerName", "phone", "division", "district", "area", "addressDetails", "paymentMethod"],
        properties: {
          productName:    { type: "string", description: "The exact product name as returned by search_products." },
          color:          { type: "string", description: "Chosen color, e.g. 'Black'." },
          size:           { type: "string", description: "Chosen size, e.g. 'L'." },
          quantity:       { type: "number", description: "Number of items. Default 1." },
          customerName:   { type: "string", description: "Customer's full name." },
          phone:          { type: "string", description: "Customer's phone number (BD format)." },
          division:       { type: "string", description: "Division, e.g. 'Dhaka'." },
          district:       { type: "string", description: "District, e.g. 'Dhaka'." },
          area:           { type: "string", description: "Upazila/thana/area, e.g. 'Mirpur'." },
          addressDetails: { type: "string", description: "Street, building, flat details." },
          paymentMethod:  { type: "string", enum: ["cod", "bkash", "nagad", "rocket", "card"], description: "Payment method." },
          notes:          { type: "string", description: "Any special instructions from the customer." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description:
        "Look up the status and tracking timeline of the logged-in customer's order. Only works for authenticated users and only ever returns the customer's own orders. Use when a customer asks 'where is my order' or about delivery status.",
      parameters: {
        type: "object",
        properties: {
          orderNumber: { type: "string", description: "Optional specific order number. If omitted, returns the customer's most recent order." },
        },
      },
    },
  },
];

async function searchProducts(args: {
  search?: string;
  category?: string;
  colors?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
}) {
  const where = buildCatalogWhere({
    search: args.search,
    category: args.category,
    colors: args.colors,
    sizes: args.sizes,
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
  });

  const products = await prisma.product.findMany({
    where,
    select: productListSelect,
    orderBy: buildCatalogOrderBy(args.sort ?? "featured"),
    take: 5,
  });

  if (!products.length) {
    return { products: [], note: "No matching products were found in the catalog." };
  }

  return {
    products: products.map((p) => {
      const inStock = p.variants.filter((v) => v.stockQuantity > 0);
      return {
        name: p.name,
        price: Number(p.price),
        currency: "BDT",
        url: `${APP_URL}/products/${p.slug}`,
        colors: [...new Set(inStock.map((v) => v.color))],
        sizes: [...new Set(inStock.map((v) => v.size))],
        inStock: inStock.length > 0,
      };
    }),
  };
}

async function placeOrder(
  args: {
    productName: string;
    color: string;
    size: string;
    quantity?: number;
    customerName: string;
    phone: string;
    division: string;
    district: string;
    area: string;
    addressDetails: string;
    paymentMethod: "cod" | "bkash" | "nagad" | "rocket" | "card";
    notes?: string;
  },
  ctx: ChatToolContext
) {
  // Find the matching variant
  const variant = await prisma.productVariant.findFirst({
    where: {
      color: { equals: args.color, mode: "insensitive" },
      size:  { equals: args.size,  mode: "insensitive" },
      stockQuantity: { gt: 0 },
      product: { name: { contains: args.productName, mode: "insensitive" }, status: "active" },
    },
    select: {
      id: true,
      color: true,
      size: true,
      sku: true,
      stockQuantity: true,
      product: { select: { id: true, name: true, price: true, slug: true } },
    },
  });

  if (!variant) {
    // Tell the model exactly what IS available so it can inform the customer correctly
    const available = await prisma.productVariant.findMany({
      where: {
        stockQuantity: { gt: 0 },
        product: { name: { contains: args.productName, mode: "insensitive" }, status: "active" },
      },
      select: { color: true, size: true },
    });
    const options = available.map((v) => `${v.color} / ${v.size}`).join(", ");
    return {
      error: "variant_not_found",
      message: `"${args.color} / ${args.size}" is not available for ${args.productName}. In-stock options are: ${options || "none"}. Tell the customer which options exist and ask them to choose one.`,
    };
  }

  const qty      = Math.max(1, args.quantity ?? 1);
  const price    = Number(variant.product.price);
  const subtotal = price * qty;
  const isInsideDhaka = args.division.toLowerCase() === "dhaka" && args.district.toLowerCase() === "dhaka";
  const shippingFee   = subtotal >= 2000 ? 0 : isInsideDhaka ? 60 : 120;
  const total = subtotal + shippingFee;

  const orderNumber = `AG-${Date.now().toString(36).toUpperCase()}`;

  const shippingAddress = {
    name:    args.customerName,
    phone:   args.phone,
    division: args.division,
    district: args.district,
    area:    args.area,
    details: args.addressDetails,
  };

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId:         ctx.userId ?? undefined,
      status:         args.paymentMethod === "cod" ? "confirmed" : "pending_payment",
      subtotal,
      shippingFee,
      total,
      shippingAddress,
      paymentMethod:  args.paymentMethod,
      paymentStatus:  "pending",
      notes:          args.notes,
      items: {
        create: {
          variantId:           variant.id,
          productNameSnapshot: variant.product.name,
          variantSnapshot:     { color: variant.color, size: variant.size, sku: variant.sku },
          unitPrice:           price,
          quantity:            qty,
        },
      },
      statusHistory: {
        create: {
          status: args.paymentMethod === "cod" ? "confirmed" : "pending_payment",
          note:   "Order placed via Aura Bot",
        },
      },
    },
  });

  return {
    success: true,
    orderNumber:  order.orderNumber,
    product:      `${variant.product.name} (${variant.color}, ${variant.size})`,
    quantity:     qty,
    subtotal,
    shippingFee,
    total,
    currency:     "BDT",
    paymentMethod: args.paymentMethod,
    status:       order.status,
    message:
      args.paymentMethod === "cod"
        ? `Order confirmed! ✅ Your order number is ${order.orderNumber}. Pay ৳${total} on delivery. We'll call you at ${args.phone} to confirm.`
        : `Order placed! 📋 Order number: ${order.orderNumber}. Total: ৳${total}. Please send payment via ${args.paymentMethod.toUpperCase()} to 01774433063 with your order number as reference. We'll confirm once payment is received.`,
  };
}

async function getOrderStatus(args: { orderNumber?: string }, ctx: ChatToolContext) {
  if (!ctx.userId) {
    return {
      error: "not_logged_in",
      message:
        "The customer is not logged in. Politely ask them to log in on the website to see order details, or to contact WhatsApp 01774433063 with their order number.",
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      userId: ctx.userId, // SECURITY: always scope to the authenticated user — never trust a model-supplied id alone
      ...(args.orderNumber ? { orderNumber: args.orderNumber } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      courierName: true,
      trackingNumber: true,
      items: { select: { productNameSnapshot: true, quantity: true } },
      statusHistory: {
        select: { status: true, note: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return {
      error: "not_found",
      message: args.orderNumber
        ? "No order with that number exists on this account."
        : "This account has no orders yet.",
    };
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    currency: "BDT",
    placedAt: order.createdAt,
    courier: order.courierName,
    trackingNumber: order.trackingNumber,
    items: order.items.map((i) => `${i.quantity}× ${i.productNameSnapshot}`),
    timeline: order.statusHistory.map((h) => ({ status: h.status, at: h.createdAt, note: h.note })),
    detailsUrl: `${APP_URL}/account/orders`,
  };
}

/** Dispatch a tool call by name. Returns a JSON-serializable result for the model. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ChatToolContext
): Promise<unknown> {
  try {
    switch (name) {
      case "search_products":
        return await searchProducts(args as Parameters<typeof searchProducts>[0]);
      case "place_order":
        return await placeOrder(args as Parameters<typeof placeOrder>[0], ctx);
      case "get_order_status":
        return await getOrderStatus(args as { orderNumber?: string }, ctx);
      default:
        return { error: "unknown_tool", message: `No tool named ${name}.` };
    }
  } catch (err) {
    console.error(`[chat-tools] ${name} failed:`, err);
    return { error: "tool_failed", message: "That lookup failed. Suggest the customer try again or contact support." };
  }
}
