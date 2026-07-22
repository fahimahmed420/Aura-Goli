import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";

/*
  Every colour here is a token. If a variant ever needs a literal to look right
  in one theme, the token set is wrong — fix the tokens, not the component.
*/
const base =
  "inline-flex items-center justify-center gap-2.5 px-8 h-12 text-[12px] font-medium uppercase " +
  "tracking-[0.18em] rounded-[var(--radius-pill)] transition-colors duration-300 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-line-strong text-fg hover:bg-accent-tint",
  ghost: "text-fg-muted hover:text-fg",
};

export default function Button({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`w-4 h-4 ${className}`}
      aria-hidden="true"
    >
      <path d="M5 12h13M12 5.5 18.5 12 12 18.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
