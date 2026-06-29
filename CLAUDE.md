# Threadco Project Documentation

> Read the [PROJECT_SPEC.md](../PROJECT_SPEC.md) before coding — it's the complete specification.

## Project Overview

**Threadco** is a full-stack e-commerce platform for selling premium clothing with two halves:
1. **Customer Storefront** — Browse, search, filter, cart, checkout, pay, track orders, manage account
2. **Admin Panel** — Separate app for managing products, orders, customers, coupons, analytics

### Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS |
| 3D Hero | Spline (embedded) or Three.js |
| Backend | Node.js + Express (or Next.js Route Handlers) |
| Database | PostgreSQL |
| Cache/Session | Redis |
| Auth | JWT + bcrypt + Google OAuth 2.0 |
| Payments | SSLCommerz (bKash/Nagad/Rocket) + Stripe |
| Email | Resend or Nodemailer |
| Media | Cloudinary or S3 |

### Non-Negotiables

- **Security-first** — payment processing must tokenize cards, validate webhooks, verify signatures
- **Real data** — no mocked checkout, order tracking tied to DB status history
- **Separate auth** — customer and admin have distinct login flows
- **All states implemented** — loading, error, empty, out-of-stock, success (not just happy path)

---

## 🎯 Skills to Use (Auto-Activate by Context)

### Core Development (Start Here)

| Skill | When to Use | Mention |
|---|---|---|
| **nextjs-developer** | Storefront pages, admin dashboard, routing, SSR/SSG | "Next.js", "App Router", "Route Handlers" |
| **react-expert** | Component design, state management, cart/checkout UX | "React patterns", "component state", "hooks" |
| **typescript-pro** | Type safety across codebase, API contracts | "TypeScript", "type definitions", "generics" |
| **api-designer** | Structuring REST endpoints for storefront/admin/payments | "API design", "REST patterns", "error handling" |

### Backend & Database

| Skill | When to Use | Mention |
|---|---|---|
| **golang-pro** / **nodejs backend** | Server architecture, middleware, async patterns | "Express", "middleware", "async/await" |
| **postgres-pro** | Schema design, migrations, query patterns | "PostgreSQL", "schema", "database design" |
| **database-optimizer** | Query optimization, indexing as order volume scales | "slow query", "index", "performance tuning" |

### Security & Quality ⭐ (Critical for Payments)

| Skill | When to Use | Mention |
|---|---|---|
| **secure-code-guardian** | Cart, checkout, auth, payment flows, PII handling | "security", "payment", "sensitive data" |
| **security-reviewer** | JWT flow, HTTPS/CORS, webhook verification, password reset | "security audit", "JWT", "webhook", "XSS" |
| **test-master** | Testing strategy for auth, cart, checkout, payments | "test coverage", "integration tests" |
| **code-reviewer** | Multi-perspective feedback on complex features | "code review", "refactor" |

### Architecture & Workflow

| Skill | When to Use | Mention |
|---|---|---|
| **fullstack-guardian** | Frontend ↔ backend integration (cart sync, order flow) | "fullstack", "integration", "data flow" |
| **architecture-designer** | System design decisions, payment webhook architecture | "architecture", "system design", "diagram" |
| **debugging-wizard** | Payment webhook failures, cart sync issues, auth bugs | "debugging", "not working", "stack trace" |

---

## Build Order (From Section 8 of PROJECT_SPEC.md)

Follow this sequence — each phase depends on the previous:

1. **Database schema** — Set up Postgres, write migrations
   - 🎯 Use: **postgres-pro**

2. **Auth system** — Register/login/JWT/password reset (customer + admin)
   - 🎯 Use: **secure-code-guardian**, **security-reviewer**

3. **Backend API** — Products, categories, variants, shop filters/sort/pagination
   - 🎯 Use: **api-designer**, **postgres-pro**

4. **Admin panel** — Product CRUD with variant stock grid
   - 🎯 Use: **nextjs-developer**, **react-expert**

5. **Storefront** — Home, Shop, Product Detail pages (real data)
   - 🎯 Use: **nextjs-developer**, **react-expert**

6. **Cart & checkout** — Cart persistence, 3-step checkout, payment gateway
   - 🎯 Use: **secure-code-guardian**, **security-reviewer**, **api-designer**

7. **Order system** — Order creation on webhook, status lifecycle, admin drawer
   - 🎯 Use: **database-optimizer**, **api-designer**

8. **Order tracking** — Consumes order_status_history, 5-step timeline
   - 🎯 Use: **react-expert**, **fullstack-guardian**

9. **My Account** — Orders, profile, addresses, wishlist, password
   - 🎯 Use: **react-expert**, **nextjs-developer**

10. **Reviews** — Write modal, aggregation, rating calculations
    - 🎯 Use: **react-expert**, **database-optimizer**

11. **Remaining pages** — 404, search, legal, about, FAQ, returns
    - 🎯 Use: **nextjs-developer**, **react-expert**

12. **3D hero + polish** — Spline/Three.js, animations, design fidelity
    - 🎯 Use: **react-expert**

13. **Security hardening** — Audit checklist (Section 7 of PROJECT_SPEC.md)
    - 🎯 Use: **secure-code-guardian**, **security-reviewer**

14. **Deployment** — Vercel/Railway/managed Postgres
    - 🎯 Use: **devops-engineer** (if needed)

---

## How Skills Work

**Auto-activation**: Mention a technology and the skill loads automatically.
- "How should I structure the product API?" → **api-designer** loads
- "The payment webhook isn't working" → **debugging-wizard** loads

**Explicit activation**: Ask directly.
- "Use the **secure-code-guardian** skill: should I store refresh tokens in localStorage?"
- "Ask **database-optimizer**: will this query handle 100k orders?"

---

## 🔒 Security Checklist (Section 7, Non-Negotiable)

Before launch, verify:
- ✅ HTTPS everywhere, HSTS header
- ✅ Passwords: bcrypt hashed (never plaintext)
- ✅ JWT: short-lived access tokens, httpOnly refresh cookies
- ✅ Rate limiting on: login, register, forgot-password, checkout
- ✅ Input validation & sanitization (server-side)
- ✅ CSRF protection on state-changing requests
- ✅ SQL injection protection (parameterized queries / ORM)
- ✅ Payment data: **never store raw cards** — tokenize via gateway SDK
- ✅ Webhook signature verification before trusting payment gateway
- ✅ Admin routes check `role === 'admin'` server-side (not just UI)
- ✅ All secrets in environment variables (provide .env.example)
- ✅ Account enumeration protection (login/register/forgot-password don't leak email existence)
- ✅ File upload validation (type/size) server-side

**→ Use `secure-code-guardian` + `security-reviewer` to audit this checklist.**

---

## Database Schema (Key Tables)

See PROJECT_SPEC.md Section 5 for full schema. Essentials:

- `users` (role: customer | admin)
- `products`, `product_variants`, `product_images`
- `orders`, `order_items`, `order_status_history` ← powers tracking page
- `carts`, `cart_items`
- `reviews`, `wishlists`
- `coupons`, `payments`
- `addresses` (Bangladesh address structure)

---

## Resources

- **Full Spec**: Read [PROJECT_SPEC.md](../PROJECT_SPEC.md) — it's the source of truth
- **Design Assets**: `Design/aura_goli_*` folders (treat Stitch export as visual spec)
- **App Code**: `threadco/` directory (Next.js + backend)
- **Skills List**: Mention a technology and the matching skill auto-loads

---

## Next Steps

1. **Read** [PROJECT_SPEC.md](../PROJECT_SPEC.md) Section 7 (Security) and Section 8 (Build Order)
2. **Start phase 1**: Database schema — use **postgres-pro**
3. **On blockers**: Reference the skill matching your tech
4. **Before shipping**: Use **secure-code-guardian** + **security-reviewer** for final audit

---

## @AGENTS.md

See file for available Claude agents and how to invoke them.
