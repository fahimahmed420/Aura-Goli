/*
  Trust bar. Slower than the live site's 18s loop — at 32s it reads as ambient
  texture instead of demanding to be read, which is the point of a trust strip.
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
    <div className={`overflow-hidden ${className}`}>
      <div className="dd-marquee py-4">
        {run.map((text, i) => (
          <span key={i} className="flex items-center shrink-0">
            <span className="dd-eyebrow px-8">{text}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
          </span>
        ))}
      </div>
    </div>
  );
}
