import Button from "./Button";

/*
  Empty carts, no orders yet, no search results — same skeleton everywhere:
  quiet icon, serif title, muted body, at most one action.
*/
export default function EmptyState({
  icon,
  title,
  body,
  action,
  className = "",
}: {
  /** Material Symbols icon name */
  icon: string;
  title: string;
  body?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center py-20 px-6 ${className}`}>
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-7 bg-surface border border-line"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[28px] text-fg-subtle">{icon}</span>
      </div>
      <h2 className="dd-display text-fg text-[clamp(1.6rem,4vw,2.2rem)] mb-3">{title}</h2>
      {body && <p className="text-[15px] leading-relaxed text-fg-muted max-w-sm mb-8">{body}</p>}
      {action && (
        <Button href={action.href} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
