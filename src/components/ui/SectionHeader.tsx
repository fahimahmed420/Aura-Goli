import Link from "next/link";
import { ArrowRight } from "./Button";

/*
  Eyebrow is fg-subtle, not accent. This is the single biggest consistency fix:
  the current site paints every eyebrow gold, which spends the accent before the
  CTA ever gets to use it.
*/
export default function SectionHeader({
  eyebrow,
  title,
  link,
  size = "lg",
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  link?: { href: string; label: string };
  size?: "lg" | "xl";
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex gap-6 mb-12 md:mb-16 ${
        centered ? "flex-col items-center text-center" : "items-end justify-between"
      }`}
    >
      <div>
        <p className="dd-eyebrow text-fg-subtle mb-4">{eyebrow}</p>
        <h2
          className="dd-display text-fg"
          style={{
            fontSize: size === "xl" ? "clamp(2.6rem, 7vw, 5.5rem)" : "clamp(2rem, 5vw, 3.6rem)",
          }}
        >
          {title}
        </h2>
      </div>
      {link && (
        <Link
          href={link.href}
          className="dd-link group flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em] text-fg-muted hover:text-fg transition-colors shrink-0 mb-2"
        >
          {link.label}
          <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
