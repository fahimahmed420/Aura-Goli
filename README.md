# Aura Goli — Premium Fashion E-Commerce

> A complete, production-ready fashion e-commerce platform built for the Bangladeshi premium market. Full storefront, admin console, payments, auth, and more — all in one codebase.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)

---

## What's Inside

Aura Goli is a full-stack e-commerce platform with a customer storefront and a private admin console — built end-to-end with Next.js 16 App Router, Prisma ORM, and PostgreSQL. It covers every feature a real fashion brand needs to operate online.

Built in 2026 by **Fahim Ahmed** in collaboration with **Claude** (Anthropic AI).

---

## Features

### 🛍️ Storefront

| Feature | Details |
|---|---|
| Homepage | Hero section, featured products, flash sale banner, category grid, trust bar |
| Shop | Filter by category, color, price range · Sort by newest / price / popularity |
| Product Page | Image gallery, size selector, color picker, size chart modal, reviews, stock status, waitlist |
| Search | Full-text product search with live results |
| Cart | Persistent cart with quantity controls, coupon codes, order summary |
| Checkout | Address form, payment method selection, promo validation, order confirmation |
| Order Tracking | Track any order by order number — no login required |
| About Page | Live stats from database (customers, products, orders), team, values |
| Static Pages | FAQ, Contact, Returns, Privacy Policy, Terms of Service |
| WhatsApp Chat | Floating button links directly to WhatsApp for instant support |
| Sitemap | Auto-generated `/sitemap.xml` |

### 👤 Customer Accounts

- Register, login, forgot password, reset password
- Google OAuth sign-in
- Email verification
- Saved delivery addresses
- Full order history with detail view
- Wishlist
- Loyalty points dashboard
- Profile management

### 🔧 Admin Console (`/admin`)

| Section | Capabilities |
|---|---|
| Dashboard | Live revenue, orders, customers KPIs + Recharts graphs |
| Products | Full CRUD with variants (size, color, images), draft/publish |
| Orders | View all orders, update status (confirmed → packed → shipped → delivered) |
| Customers | Browse, view profiles, block/unblock accounts |
| Coupons | Create percent or flat discount codes with usage limits and expiry |
| Flash Sales | Schedule time-limited sitewide discount banners |
| Reviews | Approve or reject customer reviews |
| Analytics | Revenue over time, top products, order funnel |
| Settings | Store name, maintenance mode toggle |
| Size Chart | Manage the size guide displayed on product pages |
| Security | Admin activity audit log |

### 🔐 Auth System

- JWT access token (short-lived) + httpOnly refresh token cookie (long-lived)
- Google OAuth 2.0 for both customers and admins (separate flows)
- Admin access check: only users with `role = "admin"` can enter the admin console
- Password reset via email (tokenized link)
- Email verification on registration
- Route protection via Next.js middleware

### 💳 Payments

- **SSLCommerz** integration (bKash, Nagad, Rocket, card, COD) — Bangladesh's leading payment gateway
- IPN (Instant Payment Notification) for server-side payment confirmation
- Success, fail, and cancel webhook handling

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via [Neon](https://neon.tech) (serverless, never pauses) |
| ORM | Prisma 7 |
| Auth | JWT + Google OAuth 2.0 |
| Email | [Resend](https://resend.com) |
| Payments | SSLCommerz |
| Media | Cloudinary |
| Charts | Recharts |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── (store)/               # Customer-facing storefront
│   │   ├── page.tsx           # Homepage
│   │   ├── shop/              # Product listing with filters
│   │   ├── products/[slug]/   # Product detail page
│   │   ├── cart/              # Shopping cart
│   │   ├── checkout/          # Checkout flow
│   │   ├── account/           # Protected customer account pages
│   │   │   ├── orders/        # Order history + detail
│   │   │   ├── wishlist/
│   │   │   ├── addresses/
│   │   │   ├── loyalty/
│   │   │   └── profile/
│   │   ├── search/
│   │   ├── order-tracking/
│   │   ├── about/
│   │   ├── contact/
│   │   ├── faq/
│   │   └── ...
│   ├── admin/                 # Admin console (JWT-gated)
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── analytics/
│   │   ├── coupons/
│   │   ├── flash-sale/
│   │   ├── reviews/
│   │   ├── settings/
│   │   └── security/
│   └── api/                   # REST API route handlers
│       ├── auth/              # Login, register, OAuth, refresh, password reset
│       ├── admin/             # Admin CRUD (products, orders, customers, coupons...)
│       ├── products/          # Catalog, reviews
│       ├── checkout/          # Order creation + promo validation
│       ├── payment/           # SSLCommerz IPN, success, fail
│       ├── account/           # Profile, order history, wishlist, addresses
│       └── orders/            # Public order tracking
├── components/
│   ├── storefront/            # Nav, Footer, ProductCard, WhatsAppButton, etc.
│   └── admin/                 # AdminShell, Sidebar, charts
└── lib/
    ├── prisma.ts              # Prisma client singleton
    ├── auth.ts                # JWT sign/verify helpers
    ├── settings.ts            # Cached store settings
    ├── email.ts               # Resend email helpers
    ├── sslcommerz.ts          # Payment gateway integration
    └── require-auth.ts        # requireAuth / requireAdmin guards
```

---

## Database Models

```
User            customers and admins, Google OAuth, loyalty points
Product         with variants (size/color), images, categories, reviews
Category        product taxonomy
Order           line items, payment status, shipping address, order status
OrderItem       product snapshot at time of purchase
Coupon          percent or flat, usage limits, expiry dates
Review          customer reviews (moderated by admin)
LoyaltyPoint    earn on purchase, redeem on checkout
WishlistItem    saved products per user
Address         saved shipping addresses per user
FlashSale       time-limited sitewide discount
RefreshToken    JWT refresh token store (server-side rotation)
SizeChart       admin-managed size guide
StoreSettings   global settings (store name, maintenance mode)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) free tier recommended)
- [Google Cloud](https://console.cloud.google.com) OAuth 2.0 credentials
- [Resend](https://resend.com) API key
- [Cloudinary](https://cloudinary.com) account
- [SSLCommerz](https://developer.sslcommerz.com) merchant credentials (for payments)

### 1. Clone & Install

```bash
git clone https://github.com/fahimahmed420/Aura-Goli.git
cd Aura-Goli
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# ── Database ───────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# ── Auth ───────────────────────────────────────────────
JWT_ACCESS_SECRET="generate with: openssl rand -base64 64"
JWT_REFRESH_SECRET="generate with: openssl rand -base64 64"
JWT_ACCESS_EXPIRES_IN="30d"

# ── App ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ── Google OAuth ───────────────────────────────────────
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# ── Email ──────────────────────────────────────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="Aura Goli <hello@yourdomain.com>"

# ── Payments ───────────────────────────────────────────
SSLCOMMERZ_STORE_ID="your-store-id"
SSLCOMMERZ_STORE_PASSWORD="your-password"
SSLCOMMERZ_SANDBOX="true"   # set to false in production

# ── Media ──────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Database Setup

```bash
# Push Prisma schema to your database
npm run db:push

# (Optional) Open Prisma Studio to browse and edit data
npm run db:studio
```

### 4. Create Your Admin Account

1. Register an account on the storefront at `/login`
2. Open Prisma Studio (`npm run db:studio`)
3. Find your user in the `User` table and set `role` to `admin`
4. Log in at `/admin/login`

### 5. Start the Dev Server

```bash
npm run dev
```

- Storefront → [http://localhost:3000](http://localhost:3000)
- Admin → [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo. Next.js is auto-detected.

### 3. Add Environment Variables

In your Vercel project → **Settings → Environment Variables**, add all variables from `.env` with production values.

Key production changes:

| Variable | Development | Production |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://your-domain.vercel.app` |
| `SSLCOMMERZ_SANDBOX` | `true` | `false` |

### 4. Update Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → your OAuth app → **Authorized redirect URIs**, add:

```
https://your-domain.vercel.app/api/auth/google/callback
```

### 5. Set SSLCommerz Callback URLs

In your SSLCommerz merchant panel, set:

| Type | URL |
|---|---|
| Success | `https://your-domain.vercel.app/api/payment/success` |
| Fail | `https://your-domain.vercel.app/api/payment/fail` |
| Cancel | `https://your-domain.vercel.app/cart` |
| IPN | `https://your-domain.vercel.app/api/payment/ipn` |

### 6. Deploy

Vercel will build automatically. The build command is:
```
prisma generate && next build
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to database (no migration history) |
| `npm run db:migrate` | Create and run a migration |
| `npm run db:studio` | Open Prisma Studio (visual DB editor) |
| `npm run db:seed` | Seed the database with sample data |

---

## Auth Flow

```
Customer login    /api/auth/login          → JWT access token + httpOnly refresh cookie
Google (customer) /api/auth/google         → Google OAuth → /auth/callback → localStorage
Google (admin)    /api/auth/google?admin=1 → Google OAuth → checks role=admin → /admin/dashboard
Token refresh     /api/auth/refresh        → auto-handled by middleware on 401
Password reset    /api/auth/forgot-password → email with tokenized link → /reset-password/[token]
```

---

## Brand Design System

| Token | Value | Usage |
|---|---|---|
| Ink | `#0b0b14` | Dark backgrounds, primary text |
| Ivory | `#faf7f0` | Light backgrounds, reversed text |
| Gold | `#c9a84c` | Primary accent, CTAs, highlights |
| Violet | `#3d2b7a` | Secondary accent, hero overlays |
| Display font | Playfair Display | Headings and hero text |
| Body font | System sans-serif | Body copy and UI |

---

## Contact & Support

- **WhatsApp**: [+8801774433063](https://wa.me/8801774433063)
- **GitHub**: [@fahimahmed420](https://github.com/fahimahmed420)

---

## Architecture Note (Frontend/Backend)

This project uses **Next.js App Router Route Handlers** (`src/app/api/**`) as the backend REST API, colocated with the frontend in a single codebase rather than a separate Express server. This is one of the officially allowed backend choices for this assignment ("Node.js / Express.js — REST API development" *or* Next.js Route Handlers serve the same role).

Because of that, the **frontend and backend share one repository and one deployment** — see the submission block below.

---

## Assignment Submission

```
Frontend Repo    : https://github.com/fahimahmed420/Aura-Goli
Backend Repo     : https://github.com/fahimahmed420/Aura-Goli   (Next.js API Route Handlers in src/app/api/)

Frontend Live    : https://aura-goli.vercel.app
Backend Live     : https://aura-goli.vercel.app/api             (e.g. /api/products, /api/categories)

Demo Video       : <ADD_YOUR_GOOGLE_DRIVE_LINK_HERE>

Admin Email      : admin@threadco.com
Admin Password   : AuraGoli2026#Grade
Admin Login URL  : https://aura-goli.vercel.app/admin/login
```

> Admin credentials above are rotated specifically for grading. To reset them at any time:
> `npx ts-node --compiler-options {"module":"CommonJS"} prisma/reset-admin-password.ts <email> "<new-password>"`

---

*Built with Next.js · Deployed on Vercel · Database by Neon · Made in Dhaka 🇧🇩*
