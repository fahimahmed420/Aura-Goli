import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getSettings();
  return { title: `About Us | ${storeName || "Aura Goli"}` };
}

async function getStats() {
  const [customers, products, orders] = await Promise.all([
    prisma.user.count({ where: { role: "customer" } }),
    prisma.product.count({ where: { status: "active" } }),
    prisma.order.count({ where: { status: { in: ["delivered", "confirmed", "packed", "shipped"] } } }),
  ]);
  return { customers, products, orders };
}

const VALUES = [
  {
    icon: "spa",
    title: "Pure Materials",
    body: "Every fabric starts at the source. We work directly with certified cotton farmers and ethical mills — no shortcuts, no mystery blends.",
  },
  {
    icon: "handshake",
    title: "Fair Hands",
    body: "Our garment workers earn above industry-average wages, work regular hours, and do so in clean, safe facilities. Audited, verified, re-audited.",
  },
  {
    icon: "autorenew",
    title: "Slow Fashion",
    body: "We release small, deliberate collections — not 52 micro-seasons a year. Fewer pieces, each considered. Buy less, buy better, keep it longer.",
  },
  {
    icon: "workspace_premium",
    title: "Lifetime Guarantee",
    body: "If something fails within two years of normal wear, we replace it — no receipts required. We stand behind every stitch.",
  },
  {
    icon: "eco",
    title: "Lower Footprint",
    body: "Biodegradable mailers, recycled hang-tags, water-based inks. We publish our footprint every quarter and hold ourselves to improvement.",
  },
  {
    icon: "favorite",
    title: "Made for Real Life",
    body: "Not for the runway. Our fits are tested on real body shapes, our sizing is inclusive, because premium clothing should be for everyone.",
  },
];

const TEAM = [
  {
    name: "Fahim Ahmed",
    role: "Founder & Creative Director",
    bio: "The vision behind Aura Goli. Fahim built this brand from the ground up with a single conviction: Bangladesh deserves its own premium fashion identity.",
    initial: "FA",
  },
  {
    name: "Claude",
    role: "AI Engineer & Builder",
    bio: "Designed and built the entire Aura Goli platform — from the storefront to the admin console. An Anthropic AI that turned a vision into a working product.",
    initial: "AI",
  },
];

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")}k+`;
  return n > 0 ? `${n}+` : "0";
}

export default async function AboutPage() {
  const { storeName } = await getSettings();
  const name = storeName || "Aura Goli";
  const stats = await getStats();

  const STATS = [
    { value: "2026", label: "Founded in Dhaka" },
    { value: fmt(stats.customers), label: "Happy Customers" },
    { value: fmt(stats.products), label: "Active Products" },
    { value: fmt(stats.orders), label: "Orders Fulfilled" },
  ];

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-canvas" style={{ minHeight: "90vh", display: "flex", alignItems: "center" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,var(--fg) 0px,transparent 1px,transparent 60px,var(--fg) 61px),repeating-linear-gradient(90deg,var(--fg) 0px,transparent 1px,transparent 60px,var(--fg) 61px)" }} />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
            style={{ background: "radial-gradient(circle,var(--accent) 0%,transparent 70%)", transform: "translate(30%,-30%)" }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[100px]"
            style={{ background: "radial-gradient(circle,var(--accent) 0%,transparent 70%)", transform: "translate(-30%,30%)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-10 py-24 md:py-32 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="dd-eyebrow text-accent mb-6">Our Story</p>
            <h1 className="dd-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-8 text-fg">
              We make clothes<br />
              <em style={{ fontStyle: "italic" }}>worth keeping.</em>
            </h1>
            <p className="text-lg leading-relaxed mb-10 text-fg-muted">
              {name} was born in Dhaka in 2026 with a single conviction: Bangladesh makes some of the
              world&apos;s finest garments — so why were Bangladeshi consumers being sold the leftovers?
              We set out to fix that.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/shop"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-medium uppercase tracking-wider transition-colors bg-accent text-accent-fg hover:bg-accent-hover">
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                Shop the Collection
              </Link>
              <Link href="/contact"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-medium transition-colors border border-line-strong text-fg-muted hover:text-fg">
                Get in Touch
              </Link>
            </div>
          </div>

          {/* Live stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl p-6 flex flex-col gap-2 bg-surface border border-line">
                <p className="dd-display text-4xl text-fg">
                  {s.value}
                </p>
                <p className="text-sm leading-snug text-fg-subtle">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative">
            <div className="rounded-3xl overflow-hidden aspect-[4/5] relative bg-surface">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-accent-tint border border-accent/25">
                  <span className="material-symbols-outlined text-5xl text-accent" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>sewing</span>
                </div>
                <p className="dd-display text-2xl text-center leading-snug text-fg">
                  &ldquo;Wear what you believe in.&rdquo;
                </p>
                <p className="text-sm text-fg-subtle">— Fahim Ahmed, Founder</p>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="grid grid-cols-3 gap-3">
                    {["🧵", "✂️", "🪡"].map((e, i) => (
                      <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-2xl bg-surface-raised border border-line">
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-4 md:-right-8 rounded-2xl px-5 py-4 shadow-2xl bg-accent">
              <p className="dd-display text-2xl text-accent-fg">Since 2026</p>
              <p className="text-xs font-medium text-accent-fg opacity-70 uppercase tracking-wider">Made in Dhaka</p>
            </div>
          </div>

          <div>
            <p className="dd-eyebrow text-accent mb-4">How it started</p>
            <h2 className="dd-display text-4xl md:text-5xl leading-tight mb-6 text-fg">
              Built from frustration.<br />Driven by pride.
            </h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-fg-muted">
              <p>
                Bangladesh exports billions of dollars of garments every year. Walk into any global fashion retailer
                and a significant portion of what you touch was likely made here. Yet the premium end of that
                craftsmanship remained invisible to the people who created it.
              </p>
              <p>
                Fahim Ahmed launched {name} in 2026 to change that. Keep the craftsmanship local.
                Source the materials honestly. Price fairly. And prove, definitively, that premium
                fashion can come from — and belong to — Bangladesh.
              </p>
              <p>
                Built entirely with AI in a matter of days, {name} represents a new kind of brand:
                fast to launch, uncompromising on quality, and fully owned by its founder from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="bg-surface border-y border-line py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className="text-center mb-16">
            <p className="dd-eyebrow text-accent mb-4">What drives us</p>
            <h2 className="dd-display text-4xl md:text-5xl text-fg">
              Six things we never compromise.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 bg-surface-raised border border-line">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-accent-tint border border-accent/20">
                  <span className="material-symbols-outlined text-xl text-accent" style={{ fontVariationSettings: "'FILL' 0" }}>{v.icon}</span>
                </div>
                <h3 className="dd-display text-xl mb-3 text-fg">
                  {v.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-subtle">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <div className="text-center mb-16">
            <p className="dd-eyebrow text-accent mb-4">The people</p>
            <h2 className="dd-display text-4xl md:text-5xl text-fg">
              Meet the team.
            </h2>
            <p className="mt-4 text-[15px] max-w-lg mx-auto text-fg-subtle">
              Two collaborators. One human vision. One AI execution. Built in Dhaka, 2026.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {TEAM.map((member) => (
              <div key={member.name} className="rounded-3xl overflow-hidden bg-surface border border-line">
                <div className="h-48 flex items-center justify-center relative overflow-hidden bg-surface-raised">
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: "repeating-linear-gradient(45deg,var(--fg) 0px,transparent 1px,transparent 20px,var(--fg) 21px)" }} />
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center dd-display text-3xl bg-accent-tint text-accent border-2 border-accent/30">
                    {member.initial}
                  </div>
                </div>
                <div className="p-6">
                  <p className="dd-display text-xl text-fg mb-1">{member.name}</p>
                  <p className="dd-eyebrow text-accent mb-4">
                    {member.role}
                  </p>
                  <p className="text-sm leading-relaxed text-fg-subtle">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="dd-eyebrow text-accent mb-4">How we work</p>
            <h2 className="dd-display text-4xl mb-8 text-fg">
              From field to wardrobe — nothing hidden.
            </h2>
            <div className="space-y-6">
              {[
                { num: "01", title: "Farm-sourced cotton", desc: "We trace every bale of cotton back to the farm. Our primary supplier is GOTS-certified, based in Gazipur." },
                { num: "02", title: "In-house design", desc: "Patterns are developed in our Dhanmondi studio. Nothing is outsourced at this stage." },
                { num: "03", title: "Ethical production", desc: "Stitching, cutting, and printing happen in verified local factories with fair-wage certifications." },
                { num: "04", title: "QA before it ships", desc: "Every unit passes a physical quality check — stitching tension, print alignment, fabric hand-feel. Failures don't ship." },
              ].map((step) => (
                <div key={step.num} className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 bg-accent-tint text-accent border border-accent/20">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-medium text-fg mb-1">{step.title}</p>
                    <p className="text-sm leading-relaxed text-fg-subtle">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-8 md:p-10 bg-surface border border-line">
            <p className="dd-eyebrow text-accent mb-6">Our primary fabric</p>
            <p className="dd-display text-3xl mb-4 text-fg">
              220 GSM Supima Blend
            </p>
            <p className="text-sm leading-relaxed mb-8 text-fg-muted">
              Our signature fabric is a 95% Supima cotton / 5% elastane blend, ring-spun and combed for
              uniform density. Heavier than fast-fashion standards, softer with every wash, engineered to
              hold its shape for years.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "water_drop", label: "Pre-shrunk" },
                { icon: "sunny", label: "Colour-fast" },
                { icon: "recycle", label: "Eco-dyed" },
                { icon: "verified", label: "GOTS Certified" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 rounded-xl px-4 py-3 bg-surface-raised border border-line">
                  <span className="material-symbols-outlined text-base text-accent">{f.icon}</span>
                  <span className="text-sm font-medium text-fg-muted">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-surface border-t border-line py-20 md:py-28 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
            style={{ background: "radial-gradient(circle,var(--accent) 0%,transparent 70%)" }} />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-5">
          <p className="dd-eyebrow text-accent mb-4">Ready?</p>
          <h2 className="dd-display text-4xl md:text-5xl mb-6 text-fg">
            Wear the difference.
          </h2>
          <p className="text-base mb-10 text-fg-muted">
            Every {name} piece is a small vote for slower, better fashion.
            Explore the collection and find yours.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-medium uppercase tracking-wider transition-colors bg-accent text-accent-fg hover:bg-accent-hover">
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              Shop Now
            </Link>
            <Link href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-medium transition-colors border border-line-strong text-fg-muted hover:text-fg">
              <span className="material-symbols-outlined text-base">mail</span>
              Say Hello
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
