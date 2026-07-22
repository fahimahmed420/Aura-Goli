# Aura Goli — Noir + Gold Design System

Reference doc for the sitewide redesign completed in this session. Read this
first before touching styling — it has the token vocabulary, what's done,
what's deliberately left alone, and the bugs/gotchas already hit so they
don't get re-discovered.

---

## What this is

The whole product — storefront, admin panel, transactional emails — runs on
one dark design system: `#0B0B14` canvas, Instrument Serif display type,
Inter Tight UI type, and a **strict accent budget**: gold (`#C9A84C`) only
appears on things you can click or must notice (primary CTA, active nav
state, sale badge). Everything else carries on a three-step surface ramp
(`canvas → surface → surface-raised`) and an ivory text ramp
(`fg → fg-muted → fg-subtle`).

Previously the site ran two unrelated palettes simultaneously — a leftover
Material/Stitch grey set and a jewel-tone set — with ~1,900 hardcoded hex
literals and almost no token layer. That's why "modernize the design" meant
a real token system, not a repaint.

## Source of truth files

| File | What it is |
|---|---|
| `src/app/design-tokens.css` | The token layer. `[data-theme="noir"]` block defines every CSS custom property. Read this first. |
| `src/app/globals.css` | Global resets, `.field-input`, native `<select>` dark styling, focus rings, scrollbar. |
| `src/lib/brand.ts` | TS mirror of the tokens for places that can't read CSS vars — Recharts, email HTML strings. `BRAND`, `CHART`, `EMAIL` exports. Keep in sync with design-tokens.css by hand; nothing auto-generates this. |
| `src/components/ui/*` | The shared primitive set: `Button`, `Badge`, `SectionHeader`, `ProductCard`, `Marquee`, `Field`/`Input`/`Textarea`/`Select`, `StatusPill`, `Spinner`, `EmptyState`. Use these for new work instead of hand-rolling. |
| `/design-demo/noir` (`src/app/design-demo/`) | Living style guide page. Not linked in nav, `robots: noindex`. Kept as a reference — if you're unsure what "on-brand" looks like, load this route. |
| `src/app/layout.tsx` | Sets `data-theme="noir"` on `<html>`, loads Instrument Serif + Inter Tight via `next/font`. This is what makes the theme sitewide — nothing else needs to set the attribute. |

## Token vocabulary (semantic, not brand names)

```
--canvas          #0b0b14   page background
--surface          #14131f   raised sections, cards
--surface-raised   #1d1b2b   hover states, popovers, input fields

--fg               #f7f4ec   primary text
--fg-muted         #a5a1b0   secondary text
--fg-subtle        #6e6a7d   captions, eyebrows, meta

--accent           #c9a84c   CTA / active state ONLY — ration it
--accent-hover     #dcbb5e
--accent-fg        #0b0b14   text on accent-filled elements
--accent-tint      rgba(201,168,76,.10)   accent-tinted surfaces

--line             rgba(247,244,236,.09)   hairline borders
--line-strong      rgba(247,244,236,.18)   emphasized borders

--success / --success-tint   #1a7f37 / #e6f4ea
--warning / --warning-tint   #b4690e / #fdf0e3
--danger  / --danger-tint    #ba1a1a / #fdecea
```

Status ramp is shared and theme-independent — order states, stock warnings,
form errors mean the same color everywhere (`StatusPill` is the canonical
consumer).

Font stacks: `--font-display` (Instrument Serif, `dd-display` class),
`--font-ui` (Inter Tight, default body font). Never name a font-family
directly in a component — always go through these.

**Rule that matters most:** eyebrows/labels are `fg-subtle`, not gold.
Headings are `fg`, not gold. If you're reaching for `accent` on something
that isn't a button, a badge, or an active nav/tab state, stop — that's the
exact mistake the old design made everywhere.

## Radius / motion vocabulary

- `--radius-card: 4px` on cards and images. `--radius-pill: 999px` on
  buttons/chips/controls. Nothing else — don't introduce a third radius.
- `.dd-display`, `.dd-eyebrow`, `.dd-link`, `.dd-media`, `.dd-card`,
  `.dd-rise`, `.dd-marquee` in `design-tokens.css` are the shared motion/type
  primitives. Reuse them; don't write new one-off keyframes per page.

## Rollout status — what's done

All ten phases of the sitewide sweep are complete:

0. Token foundation + `brand.ts` + promoted `components/ui/`
1. Shell: Nav, Footer, LoadingScreen (curtain), FlashSaleBanner, ChatWidget
2. Home + Hero3D (WebGL silk kept, re-typeset, gold rationed)
3. Shop + product detail (ShopClient, ProductDetailClient — the two largest
   files, 741 and 1,430 lines)
4. Cart, checkout (3-step), order tracking/confirmation
5. Auth + account (login, forgot/reset password, all 6 account tabs)
6. Content pages (about, contact, FAQ, terms, privacy, returns, 404, error)
7. Admin panel (shell, sidebar, ~18 pages, dense/related-not-identical to
   storefront per spec)
8. Transactional emails (`lib/email.ts` — deliberately **light body / dark
   ink header**, not full-dark; see below)
9. Polish pass (selection, scrollbar, focus rings, reduced-motion — mostly
   already correct as a side effect of building tokens right in phase 0)
10. Cleanup — dead CSS removed, hex audit, `tsc`/build gates

**Hex audit baseline:** grep for `#[0-9a-fA-F]{3,8}` across `src/` should
return ~37 hits, 100% accounted for: bKash/Nagad/Rocket/Google/WhatsApp
brand colors, garment swatch colors (`swatchColor()` in ShopClient /
ProductDetailClient), browser chrome metadata (`manifest.ts`, `viewport`),
and `design-tokens.css`/`brand.ts` themselves. If that count grows
meaningfully, something regressed to a hardcoded literal instead of a token.

## Emails are intentionally NOT dark

`lib/email.ts` and the two email-shaped routes (`api/contact/route.ts`,
`api/unsubscribe/route.ts`) use `EMAIL.*` from `brand.ts`: dark ink header
band (`EMAIL.headerBg`) + light ivory body (`EMAIL.bodyBg`/`EMAIL.cardBg`).
This is deliberate — dark-mode email clients invert unpredictably and Gmail
clips heavy backgrounds. Don't "fix" emails to match the dark site theme.

`unsubscribe/route.ts`'s HTML page is the one exception — it's a **standalone
served page**, not an email, so it uses `BRAND.*` (the dark tokens) since it
should look like the rest of the site, not like an email.

## Known gotchas hit this session (don't re-discover these)

1. **Bulk sed across light→dark inversion is dangerous.** A hex literal's
   *role* (background vs. text-on-dark-chip vs. text-on-light-card) isn't
   recoverable from the hex value alone. Several "dark island on light page"
   components (a deliberately-dark floating bar/badge that used to contrast
   against a light page) got inverted wrong by blind find-replace, producing
   invisible dark-on-dark text. Always re-render and check contrast after a
   mechanical sweep, don't trust the diff alone.
2. **`sed` deleting a wrapping div's closing tag.** Multi-line `old_string`
   edits that don't include the full matched block's closing tag will
   silently drop it. `tsc` did NOT catch this (TypeScript's JSX parser is
   lenient); it only showed up as a Turbopack/SWC parse error in *dev mode*.
3. **Never run `npm run build` while a dev preview server is also using
   `.next/`.** Both write to the same directory; mixing build and dev
   artifacts in the shared Turbopack cache corrupts it and produces
   phantom/stale parse errors in the dev server that persist across restarts
   and `rm -rf .next` unless you clear it *again* after the build finishes.
   If you need a production build sanity check, stop the dev preview first,
   build, then `rm -rf .next` before restarting dev.
4. **`font-['Playfair_Display']` / `font-['Hanken_Grotesk']` Tailwind
   arbitrary classes are dead** — those fonts are no longer loaded
   (`fonts.css` and the woff2 files were deleted in phase 0/10). Any
   remaining reference falls back to a generic serif/sans silently — no
   error, just wrong-looking type. Grep for `Playfair` / `Hanken` if you're
   ever unsure a page got fully migrated.
5. **Native `<select>` dropdown popups don't inherit dark theme
   automatically** just because the page background is dark — you need
   `color-scheme: dark` (set globally, see `design-tokens.css`) *and*
   explicit `select option { background; color; }` in `globals.css`, because
   Chrome only partially honors `color-scheme` for the option list itself.
6. **Garment color swatches (`swatchColor()` helper, appears in ShopClient
   and ProductDetailClient) are real product colors, not theme colors** —
   "white" must render as an actual light swatch (`#f4f2ec`), not the dark
   `surface-raised` token, even though the rest of the page is dark. Don't
   let a hex-audit sweep "fix" these into theme tokens.
7. **`AccountLayoutClient`'s mobile drawer was already dark before this
   redesign** (coincidentally used the same ink/gold literals) — it needed
   token substitution for consistency but wasn't a contrast bug like #1.

## Where to look for examples

- **Status badges / order states:** `components/ui/StatusPill.tsx` — single
  mapping consumed by tracking page, account orders, admin orders.
- **Dark-theme-safe forms:** `components/ui/Field.tsx` (new work) or the
  `.field-input` global class (existing forms not yet migrated to the
  component — both are token-driven, pick either).
- **Product cards:** `components/ui/ProductCard.tsx` is the one card for the
  whole site. `ProductDetailClient.tsx` and `ShopClient.tsx` have their own
  inline card variants for wishlist/hover-swap reasons specific to those
  pages — don't be surprised they don't import the shared one.
- **Compact modal patterns:** `ShopClient.tsx`'s mobile filter/sort modals
  (recently tightened — 360px/340px max-width, `text-[11-14px]` scale, 32-40px
  touch targets) are a good reference for "compact but still ≥44px tappable."

## Verification habits that mattered

- `npx tsc --noEmit -p tsconfig.json` after every batch of edits — catches
  type errors but **not** JSX structural bugs from careless multi-line
  find-replace (see gotcha #2). Follow up with an actual page load.
- `grep -rn -E "#[0-9a-fA-F]{3,8}" --include="*.tsx" --include="*.ts"
  --include="*.css" src/ | grep -vE "design-tokens\.css|lib/brand\.ts"` — the
  standing hex-audit command. Re-run after any styling change.
- Check `getComputedStyle(el).backgroundColor` / `.color` via the browser's
  JS tool on a couple of real elements per page — this is what actually
  caught the sticky-bar and review-form invisible-text bugs; a visual pass
  alone would have missed them in a screenshot-less environment.
