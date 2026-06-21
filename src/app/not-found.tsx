import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col items-center justify-center px-4 text-center">
      <p className="font-['Playfair_Display'] text-[120px] md:text-[180px] font-bold text-black leading-none opacity-5 select-none">
        404
      </p>
      <div className="-mt-8 md:-mt-12 relative z-10">
        <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-black mb-4">
          Page Not Found
        </h1>
        <p className="text-[#444748] text-lg max-w-md mx-auto mb-10">
          The page you&apos;re looking for doesn&apos;t exist, or it may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#5951b4] transition-colors"
          >
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            Browse Shop
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-black text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-base">home</span>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
