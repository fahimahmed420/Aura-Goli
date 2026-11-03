/*
  Trust bar. Slower than the live site's 18s loop — at 32s it reads as ambient
  texture instead of demanding to be read, which is the point of a trust strip.
  Gold diamonds separate items and the edges fade into the ground.
*/
export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  const run = [...items, ...items];
  return (
    <div className={`overflow-hidden ag-fade-x ${className}`}>
      <div className="dd-marquee py-5">
        {run.map((text, i) => (
          <span key={i} className="flex items-center shrink-0">
            <span className="dd-eyebrow px-8 text-fg-muted">{text}</span>
            <svg aria-hidden="true" viewBox="0 0 10 10" className="w-2 h-2 text-accent opacity-70">
              <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
