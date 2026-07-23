import Image from "next/image";

// Branded loading state — shown only while real data/auth checks are in
// flight (callers gate this on their own loading boolean). No fixed timer:
// it disappears the instant the underlying fetch resolves.
export default function AuraLoadingScreen({
  fullScreen = false,
  label = "Loading",
}: {
  fullScreen?: boolean;
  label?: string;
}) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <span
          className="absolute inset-0 rounded-full animate-spin"
          style={{ border: "2px solid var(--line)", borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
        />
        <Image src="/logo-mark.png" alt="" width={22} height={24} className="h-[22px] w-auto opacity-90" />
      </div>
      <p className="dd-eyebrow text-fg-subtle">{label}</p>
    </div>
  );

  if (!fullScreen) {
    return <div className="flex items-center justify-center py-24">{content}</div>;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-canvas" style={{ zIndex: 100 }}>
      {content}
    </div>
  );
}
