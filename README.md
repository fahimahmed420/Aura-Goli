# Aura Goli — Premium T-Shirt E-Commerce

Full-stack e-commerce platform built with Next.js 16, Prisma, Supabase, and SSLCommerz.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 (PgBouncer pooler adapter) |
| Auth | JWT (access + refresh tokens, HttpOnly cookies) |
| Payments | SSLCommerz (Bangladesh gateway) |
| Email | Resend |
| Media | Cloudinary |
| 3D Hero | Three.js |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd threadco
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your actual values. See `.env.example` for descriptions of each variable.

**Required to run locally:**
- `DATABASE_URL` — Supabase pooler URL (port 6543)
- `DIRECT_URL` — Supabase direct URL (port 5432, for schema push)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — generate with `openssl rand -base64 64`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### 3. Push the database schema

```bash
# Uses DIRECT_URL (port 5432) — override DATABASE_URL for this command only
$env:DATABASE_URL="postgresql://..." ; npx prisma db push
npx prisma generate
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Deployment — Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/auragoli.git
git push -u origin main
```

### 2. Import project in Vercel

Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo.

Framework preset will be detected as **Next.js** automatically.

### 3. Set environment variables in Vercel

In the Vercel project dashboard → **Settings → Environment Variables**, add every variable from `.env.example` with your production values.

Key production differences from local:
| Variable | Local | Production |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://auragoli.com` |
| `SSLCOMMERZ_SANDBOX` | `true` | `false` |
| `NODE_ENV` | `development` | `production` (set automatically) |

### 4. Set up SSLCommerz callbacks

In your [SSLCommerz merchant panel](https://merchant.sslcommerz.com), set the callback URLs:

| Type | URL |
|---|---|
| Success URL | `https://auragoli.com/api/payment/success` |
| Fail URL | `https://auragoli.com/api/payment/fail` |
| Cancel URL | `https://auragoli.com/cart` |
| IPN URL | `https://auragoli.com/api/payment/ipn` |

### 5. Deploy

Vercel auto-deploys on every push to `main`. The build command runs:

```
prisma generate && next build
```

This ensures the Prisma client is generated before Next.js builds.

---

## Database Schema Changes

Always use the direct URL (port 5432) to push schema changes — the pooler URL won't work for DDL.

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres.[ref]:[pass]@...supabase.com:5432/postgres"
npx prisma db push
npx prisma generate
```

---

## Project Structure

```
src/
├── app/
│   ├── (store)/          # Public storefront
│   │   ├── page.tsx      # Home with 3D hero
│   │   ├── shop/         # Product listing
│   │   ├── products/     # Product detail
│   │   ├── cart/         # Shopping cart
│   │   ├── checkout/     # 3-step checkout
│   │   ├── account/      # My Account (auth-gated)
│   │   ├── order-tracking/
│   │   ├── search/
│   │   ├── about/ faq/ contact/ returns/ privacy/ terms/
│   ├── admin/            # Admin panel
│   │   ├── dashboard/    # KPIs + charts
│   │   ├── products/     # Product CRUD
│   │   ├── orders/       # Order management
│   │   ├── customers/    # Customer list
│   │   └── reviews/      # Review moderation
│   └── api/              # Route handlers
│       ├── auth/         # Login, register, refresh, password reset
│       ├── admin/        # Admin APIs (requireAdmin guard)
│       ├── products/     # Catalog + reviews
│       ├── checkout/     # Order creation + promo validation
│       ├── payment/      # SSLCommerz callbacks
│       ├── account/      # Profile + order history
│       └── orders/       # Public order lookup (tracking)
├── components/
│   ├── admin/            # AdminShell, Sidebar, Topbar, ProductForm
│   ├── storefront/       # Nav, Footer, HeroCanvas
│   └── ui/               # FadeUp utility
└── lib/
    ├── prisma.ts         # Prisma client (PgBouncer adapter)
    ├── auth.ts           # JWT sign/verify
    ├── password.ts       # bcrypt hash/verify
    ├── rate-limit.ts     # In-memory rate limiter
    ├── require-auth.ts   # requireAuth / requireAdmin guards
    ├── validation.ts     # Input validation + sanitization
    ├── sslcommerz.ts     # Payment gateway integration
    ├── email.ts          # Resend email helpers
    └── catalog-query.ts  # Prisma select shapes + filter builders
```

---

## Admin Access

Create an admin user directly in the database or via Prisma Studio:

```bash
npx prisma studio
```

Set `role = "admin"` on the user record. Then log in at `/admin/login`.

---

## Environment Variable Reference

See `.env.example` for the full list with descriptions.
