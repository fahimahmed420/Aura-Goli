import "dotenv/config";
import { PrismaClient, Role, ProductStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Real apparel photography (images.unsplash.com is allow-listed in next.config.ts)
const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const SIZES = ["S", "M", "L", "XL"] as const;

type SeedProduct = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  material: string;
  careInstructions: string;
  tags: string[];
  salesCount: number;
  colors: string[];
  images: string[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Eclipse Oversized Tee",
    slug: "eclipse-oversized-tee",
    categorySlug: "oversized",
    description:
      "A drop-shoulder oversized silhouette cut from heavyweight 240 GSM cotton. Boxy, structured, and built to hold its shape wash after wash. The piece that anchors an entire fit.",
    price: 1690,
    compareAtPrice: 2190,
    material: "100% combed cotton · 240 GSM",
    careInstructions: "Machine wash cold, inside out. Tumble dry low. Do not iron print.",
    tags: ["oversized", "heavyweight", "streetwear"],
    salesCount: 184,
    colors: ["Black", "Olive", "Beige"],
    images: ["photo-1521572163474-6864f9cf17ab", "photo-1583743814966-8936f5b7be1a", "photo-1622445275576-721325763afe"],
  },
  {
    name: "Drift Boxy Tee",
    slug: "drift-boxy-tee",
    categorySlug: "oversized",
    description:
      "Relaxed through the body with a clean ribbed collar. The Drift wears effortlessly on its own or layered. Pre-washed for zero shrink and a lived-in softness from day one.",
    price: 1490,
    material: "100% ring-spun cotton · 220 GSM",
    careInstructions: "Machine wash cold. Hang dry for best longevity.",
    tags: ["oversized", "minimal", "everyday"],
    salesCount: 142,
    colors: ["White", "Navy", "Gray"],
    images: ["photo-1620799140408-edc6dcb6d633", "photo-1618354691373-d851c5c3a990", "photo-1503341504253-dff4815485f1"],
  },
  {
    name: "Aura Signature Graphic Tee",
    slug: "aura-signature-graphic-tee",
    categorySlug: "graphic",
    description:
      "Our house mark rendered in a soft hand-feel discharge print that never cracks. Regular fit, mid-weight, and finished with a tonal neck label. Quiet branding for people who get it.",
    price: 1390,
    compareAtPrice: 1790,
    material: "100% cotton · 200 GSM",
    careInstructions: "Wash inside out, cold. Do not bleach. Iron on reverse only.",
    tags: ["graphic", "signature", "print"],
    salesCount: 209,
    colors: ["Black", "White"],
    images: ["photo-1576566588028-4147f3842f27", "photo-1562157873-818bc0726f68", "photo-1581655353564-df123a1eb820"],
  },
  {
    name: "Midnight Print Tee",
    slug: "midnight-print-tee",
    categorySlug: "graphic",
    description:
      "An after-hours graphic story printed edge to edge. Mid-weight cotton with a smooth face that takes ink beautifully. Bold from the front, clean from the back.",
    price: 1590,
    material: "100% cotton · 210 GSM",
    careInstructions: "Machine wash cold, inside out. Tumble dry low.",
    tags: ["graphic", "statement", "print"],
    salesCount: 96,
    colors: ["Black", "Navy"],
    images: ["photo-1523381210434-271e8be1f52b", "photo-1556821840-3a63f95609a7", "photo-1618354691373-d851c5c3a990"],
  },
  {
    name: "Essential Crew — Onyx",
    slug: "essential-crew-onyx",
    categorySlug: "basic",
    description:
      "The perfect black tee, perfected. A true regular fit, reinforced shoulder seams, and a collar that stays flat. The one you reach for without thinking.",
    price: 990,
    material: "100% combed cotton · 180 GSM",
    careInstructions: "Machine wash warm. Tumble dry low. Warm iron if needed.",
    tags: ["basic", "essential", "everyday"],
    salesCount: 311,
    colors: ["Black", "Gray", "Navy"],
    images: ["photo-1576566588028-4147f3842f27", "photo-1503341504253-dff4815485f1", "photo-1562157873-818bc0726f68"],
  },
  {
    name: "Essential Crew — Ivory",
    slug: "essential-crew-ivory",
    categorySlug: "basic",
    description:
      "A clean, opaque white tee with no see-through compromise. Soft combed cotton with a tailored regular fit. A wardrobe foundation that punches above its price.",
    price: 990,
    material: "100% combed cotton · 180 GSM",
    careInstructions: "Wash with like colors, cold. Avoid bleach to keep whites true.",
    tags: ["basic", "essential", "white"],
    salesCount: 268,
    colors: ["White", "Beige"],
    images: ["photo-1521572163474-6864f9cf17ab", "photo-1620799140408-edc6dcb6d633", "photo-1523381210434-271e8be1f52b"],
  },
  {
    name: "Supima Luxe Tee",
    slug: "supima-luxe-tee",
    categorySlug: "premium",
    description:
      "Spun from long-staple Supima cotton for a silken hand and a subtle sheen. Garment-dyed in small batches for depth of color. This is what premium actually feels like.",
    price: 2290,
    compareAtPrice: 2890,
    material: "100% Supima cotton · 200 GSM, garment-dyed",
    careInstructions: "Cold wash, gentle cycle. Lay flat to dry. Do not wring.",
    tags: ["premium", "supima", "luxe"],
    salesCount: 173,
    colors: ["Beige", "Olive", "Black"],
    images: ["photo-1581655353564-df123a1eb820", "photo-1556821840-3a63f95609a7", "photo-1521572163474-6864f9cf17ab"],
  },
  {
    name: "Heritage Heavyweight Tee",
    slug: "heritage-heavyweight-tee",
    categorySlug: "premium",
    description:
      "A 280 GSM monster with a dense, substantial drape and double-stitched everything. Built like outerwear, worn like a tee. It only gets better with age.",
    price: 2490,
    material: "100% carded cotton · 280 GSM",
    careInstructions: "Machine wash cold. Tumble dry low. Expect minimal first-wash relaxation.",
    tags: ["premium", "heavyweight", "heritage"],
    salesCount: 128,
    colors: ["Navy", "Black", "Olive"],
    images: ["photo-1618354691373-d851c5c3a990", "photo-1576566588028-4147f3842f27", "photo-1583743814966-8936f5b7be1a"],
  },
];

const REVIEWS: { slug: string; rating: number; title: string; body: string }[] = [
  { slug: "essential-crew-onyx", rating: 5, title: "My new uniform", body: "Bought three. The fabric weight is perfect and the collar hasn't stretched at all after a month of wear and washes." },
  { slug: "supima-luxe-tee", rating: 5, title: "Worth every taka", body: "The Supima feels genuinely luxurious — soft but structured. Easily the nicest tee I own." },
  { slug: "aura-signature-graphic-tee", rating: 5, title: "Print is so clean", body: "The discharge print has zero crackle and the hand-feel is buttery. Subtle branding done right." },
  { slug: "eclipse-oversized-tee", rating: 4, title: "Great drape", body: "Love the boxy fit and heavyweight feel. Sizing runs slightly large, which is the point — size down if you want less volume." },
  { slug: "heritage-heavyweight-tee", rating: 5, title: "Built like a tank", body: "280 GSM is no joke. Feels premium, drapes beautifully. This will last me years." },
  { slug: "drift-boxy-tee", rating: 4, title: "Everyday go-to", body: "Soft from the first wear and the relaxed cut layers really well. Wish it came in more colors." },
  { slug: "essential-crew-ivory", rating: 5, title: "Finally a non-transparent white", body: "Opaque, structured, and stays white. The basic done properly." },
  { slug: "midnight-print-tee", rating: 4, title: "Bold but wearable", body: "The graphic is striking without being loud. Mid-weight cotton sits nicely." },
  { slug: "supima-luxe-tee", rating: 5, title: "Repeat buyer", body: "Second one in a different color. Consistent quality, fast delivery in Dhaka." },
  { slug: "eclipse-oversized-tee", rating: 5, title: "Anchor piece", body: "This is the tee my whole fit is built around now. Heavyweight gang." },
];

async function main() {
  // ── Users ────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@threadco.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@threadco.com",
      passwordHash: adminPassword,
      role: Role.admin,
      emailVerifiedAt: new Date(),
    },
  });

  const customerPassword = await bcrypt.hash("customer123!", 12);
  const customer = await prisma.user.upsert({
    where: { email: "rumi@example.com" },
    update: {},
    create: {
      name: "Rumi Ahmed",
      email: "rumi@example.com",
      passwordHash: customerPassword,
      role: Role.customer,
      emailVerifiedAt: new Date(),
    },
  });

  // ── Categories (with cover images) ───────────────────────────
  // NOTE: the bundled /public/*.png mockups have a transparency checkerboard
  // baked into the pixels, so they render as visible gray squares. Use clean
  // full-bleed photography for category covers instead.
  const categories = [
    { name: "Oversized", slug: "oversized", imageUrl: U("photo-1581655353564-df123a1eb820") },
    { name: "Graphic", slug: "graphic", imageUrl: U("photo-1576566588028-4147f3842f27") },
    { name: "Plain / Basic", slug: "basic", imageUrl: U("photo-1521572163474-6864f9cf17ab") },
    { name: "Premium", slug: "premium", imageUrl: U("photo-1556821840-3a63f95609a7") },
  ];
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { imageUrl: cat.imageUrl, name: cat.name },
      create: cat,
    });
    categoryIdBySlug.set(cat.slug, c.id);
  }

  // ── Demo order (snapshot) so reviews have a valid order to attach to ──
  const order = await prisma.order.upsert({
    where: { orderNumber: "AG-SEED-0001" },
    update: {},
    create: {
      orderNumber: "AG-SEED-0001",
      userId: customer.id,
      status: "delivered",
      subtotal: 4970,
      shippingFee: 0,
      total: 4970,
      shippingAddress: {
        fullName: "Rumi Ahmed",
        phone: "+8801700000000",
        line1: "House 12, Road 5, Dhanmondi",
        city: "Dhaka",
        district: "Dhaka",
        postalCode: "1209",
      },
      paymentMethod: "cod",
      paymentStatus: "paid",
    },
  });

  // ── Products (idempotent: clear managed slugs, then recreate) ─
  const slugs = PRODUCTS.map((p) => p.slug);
  // Deleting products cascades to images, variants, reviews, wishlist subs.
  await prisma.product.deleteMany({ where: { slug: { in: slugs } } });

  const productIdBySlug = new Map<string, string>();
  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.categorySlug)!;
    const variants = p.colors.flatMap((color) =>
      SIZES.map((size) => ({
        color,
        size,
        sku: `${p.slug}-${color}-${size}`.toLowerCase(),
        // A little stock variety — XL of the first color is intentionally out of stock
        stockQuantity: color === p.colors[0] && size === "XL" ? 0 : 12 + Math.floor(Math.random() * 30),
      }))
    );
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        status: ProductStatus.active,
        salesCount: p.salesCount,
        material: p.material,
        careInstructions: p.careInstructions,
        tags: p.tags,
        images: {
          create: p.images.map((id, i) => ({
            url: U(id),
            altText: `${p.name} — view ${i + 1}`,
            sortOrder: i,
          })),
        },
        variants: { create: variants },
      },
    });
    productIdBySlug.set(p.slug, created.id);
  }

  // ── Reviews ──────────────────────────────────────────────────
  for (const r of REVIEWS) {
    const productId = productIdBySlug.get(r.slug);
    if (!productId) continue;
    await prisma.review.create({
      data: {
        productId,
        userId: customer.id,
        orderId: order.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isApproved: true,
      },
    });
  }

  console.log(
    `Seed complete — ${PRODUCTS.length} products, ${REVIEWS.length} reviews, ${categories.length} categories.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
