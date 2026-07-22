import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 text-center">
      <p className="dd-display text-[120px] md:text-[180px] text-fg leading-none opacity-[0.06] select-none">
        404
      </p>
      <div className="-mt-8 md:-mt-12 relative z-10">
        <h1 className="dd-display text-4xl md:text-5xl text-fg mb-4">
          Page Not Found
        </h1>
        <p className="text-fg-muted text-lg max-w-md mx-auto mb-10">
          The page you&apos;re looking for doesn&apos;t exist, or it may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 bg-accent text-accent-fg px-8 py-4 text-xs font-medium uppercase tracking-widest hover:bg-accent-hover transition-colors"
          >
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            Browse Shop
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-line-strong text-fg px-8 py-4 text-xs font-medium uppercase tracking-widest hover:bg-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">home</span>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
