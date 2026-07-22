type Tone = "sale" | "new" | "low-stock" | "sold-out";

/*
  Sale/new borrow the brand accent; stock states use the shared status ramp, so
  a stock warning means the same thing in both themes and survives whichever
  direction wins.
*/
const tones: Record<Tone, string> = {
  sale: "bg-accent text-accent-fg",
  new: "bg-accent-tint text-accent border border-accent/30",
  "low-stock": "bg-[var(--warning-tint)] text-[var(--warning)]",
  "sold-out": "bg-[var(--danger-tint)] text-[var(--danger)]",
};

export default function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] rounded-[var(--radius-pill)] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
