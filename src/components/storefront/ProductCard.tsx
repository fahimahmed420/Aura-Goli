'use client';

import { useState } from 'react';
import Image from "next/image";
import Link from "next/link";

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: { url: string }[];
  averageRating?: number;
  _count?: { reviews: number };
  variants?: { stockQuantity: number }[];
}

export default function ProductCard({ product }: { product: Product }) {
  const [isHovering, setIsHovering] = useState(false);
  const stock = (product.variants ?? []).reduce((s, v) => s + v.stockQuantity, 0);
  const lowStock = stock > 0 && stock <= 6;
  const hasSecond = !!product.images?.[1];
  const slideStyle = (isSecond: boolean) => ({
    transform: isSecond
      ? (isHovering ? 'translateX(0%)' : 'translateX(-100%)')
      : (isHovering && hasSecond ? 'translateX(100%)' : 'translateX(0%)'),
    transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform',
  });

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block active:scale-[0.97] transition-transform"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative overflow-hidden mb-3 rounded-xl" style={{ aspectRatio: "3/4", background: "#ede8e0" }}>
        {lowStock && (
          <span
            className="absolute top-2.5 left-2.5 z-10 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: "rgba(186,26,26,0.92)", color: "#fff" }}
          >
            Only {stock} left
          </span>
        )}
        {product.images?.[0] ? (
          <>
            <Image
              src={product.images[0].url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 60vw, (max-width: 1280px) 25vw, 280px"
              className="object-cover"
              style={slideStyle(false)}
            />
            {hasSecond && (
              <Image
                src={product.images[1].url}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 60vw, (max-width: 1280px) 25vw, 280px"
                className="object-cover"
                style={slideStyle(true)}
              />
            )}
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ede8e0, #d4cec5)" }}
          >
            <span className="material-symbols-outlined text-5xl" style={{ color: "#b8b0a5" }}>
              checkroom
            </span>
          </div>
        )}
        <div
          className="absolute bottom-0 inset-x-0 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-xl"
          style={{ background: "#c9a84c", color: "#0b0b14" }}
        >
          Quick View
        </div>
      </div>
      <p className="text-[13px] font-semibold leading-snug" style={{ color: "#12103a" }}>
        {product.name}
      </p>
      {product.averageRating && product.averageRating > 0 ? (
        <div className="flex items-center gap-0.5 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="text-[11px]"
              style={{ color: i < Math.round(product.averageRating!) ? "#c9a84c" : "#d4cec5" }}
            >
              ★
            </span>
          ))}
          <span className="text-[10px] ml-1" style={{ color: "#8a8480" }}>
            ({product._count?.reviews ?? 0})
          </span>
        </div>
      ) : null}
      <p className="text-[14px] font-bold mt-0.5" style={{ color: "#3d2b7a" }}>
        ৳{Number(product.price).toLocaleString()}
      </p>
    </Link>
  );
}
