import Image from "next/image";
import Link from "next/link";
import Badge from "./Badge";

/*
  The one product card for the whole site (storefront grids, carousels,
  upsells). Normalized shape below — callers map their query result into it
  rather than the card knowing about Prisma types.
*/
export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string }[];
  categoryName?: string;
  reviewCount?: number;
  averageRating?: number;
  /** Total stock across variants. Omit to skip stock badges. */
  stock?: number;
  isNew?: boolean;
}

export default function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const soldOut = product.stock !== undefined && product.stock <= 0;
  const lowStock = product.stock !== undefined && !soldOut && product.stock <= 6;
  const rating = product.averageRating ?? 0;

  return (
    <Link href={`/products/${product.slug}`} className="dd-card group block">
      <div
        className="dd-media relative overflow-hidden mb-5 bg-surface-raised"
        style={{ aspectRatio: "3 / 4", borderRadius: "var(--radius-card)" }}
      >
        {product.images[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-fg-subtle">
            <span className="material-symbols-outlined text-4xl">checkroom</span>
          </div>
        )}

        {(onSale || soldOut || lowStock || product.isNew) && (
          <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
            {soldOut ? (
              <Badge tone="sold-out">Sold out</Badge>
            ) : (
              <>
                {onSale && <Badge tone="sale">Sale</Badge>}
                {product.isNew && !onSale && <Badge tone="new">New</Badge>}
                {lowStock && <Badge tone="low-stock">{product.stock} left</Badge>}
              </>
            )}
          </div>
        )}

        {/* Slides up on hover — one of the few permitted accent surfaces,
            because it is the buying action. */}
        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
            <div className="bg-accent text-accent-fg text-center py-4 text-[11px] font-medium uppercase tracking-[0.2em]">
              View piece
            </div>
          </div>
        )}
      </div>

      {product.categoryName && (
        <p className="dd-eyebrow text-fg-subtle mb-2">{product.categoryName}</p>
      )}
      <h3 className="text-[15px] font-medium leading-snug text-fg mb-2">{product.name}</h3>

      <div className="flex items-baseline gap-2.5">
        <span className="text-[15px] font-medium text-fg">
          ৳{product.price.toLocaleString("en-BD")}
        </span>
        {onSale && (
          <span className="text-[13px] line-through text-fg-subtle">
            ৳{product.compareAtPrice!.toLocaleString("en-BD")}
          </span>
        )}
      </div>

      {rating > 0 && (
        <div className="flex items-center gap-1.5 mt-2" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
          <Stars value={rating} />
          {product.reviewCount !== undefined && (
            <span className="text-[11px] text-fg-subtle">({product.reviewCount})</span>
          )}
        </div>
      )}
    </Link>
  );
}

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 text-fg-subtle ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="w-3 h-3"
          fill={i < Math.round(value) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="m10 2 2.4 5.1 5.6.8-4 4 .9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-4 5.6-.8z" />
        </svg>
      ))}
    </span>
  );
}
