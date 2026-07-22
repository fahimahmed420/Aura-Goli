export default function Spinner({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: "2px solid var(--line-strong)",
        borderTopColor: "var(--accent)",
      }}
    />
  );
}
