/*
  The single mapping from order/payment status → color, shared by the tracking
  page, account orders and every admin table, so a status can never be amber on
  one screen and gold on another.

  Unknown statuses fall back to the neutral style rather than throwing —
  admin-side statuses (e.g. "refunded") stay legible without a code change.
*/

type Style = { bg: string; fg: string; label: string };

const STATUS: Record<string, Style> = {
  pending_payment: { bg: "var(--warning-tint)", fg: "var(--warning)", label: "Pending payment" },
  confirmed:       { bg: "var(--accent-tint)",  fg: "var(--accent)",  label: "Confirmed" },
  packed:          { bg: "var(--accent-tint)",  fg: "var(--accent)",  label: "Packed" },
  shipped:         { bg: "var(--accent-tint)",  fg: "var(--accent)",  label: "Shipped" },
  delivered:       { bg: "var(--success-tint)", fg: "var(--success)", label: "Delivered" },
  cancelled:       { bg: "var(--danger-tint)",  fg: "var(--danger)",  label: "Cancelled" },
  /* payment_status values */
  paid:            { bg: "var(--success-tint)", fg: "var(--success)", label: "Paid" },
  unpaid:          { bg: "var(--warning-tint)", fg: "var(--warning)", label: "Unpaid" },
  failed:          { bg: "var(--danger-tint)",  fg: "var(--danger)",  label: "Failed" },
  refunded:        { bg: "var(--surface-raised)", fg: "var(--fg-muted)", label: "Refunded" },
};

const FALLBACK: Style = { bg: "var(--surface-raised)", fg: "var(--fg-muted)", label: "" };

export default function StatusPill({
  status,
  label,
  className = "",
}: {
  status: string;
  /** Override the display text (e.g. localized or count-suffixed). */
  label?: string;
  className?: string;
}) {
  const s = STATUS[status] ?? FALLBACK;
  const text = label ?? s.label ?? status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] rounded-[var(--radius-pill)] ${className}`}
      style={{ background: s.bg, color: s.fg }}
    >
      {text}
    </span>
  );
}
