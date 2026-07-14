"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useCart } from "@/lib/CartContext";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <Link href={`/products/${product._id}`} className="relative block aspect-square w-full bg-slate-100">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-400">No image</div>
        )}
      </Link>

      <div className="flex flex-1 items-start justify-between gap-2 p-4">
        <div>
          <Link href={`/products/${product._id}`}>
            <h3 className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-oceanic">
              {product.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatPKR(product.pricing.currentRetailPrice)}
          </p>
        </div>

        <button
          onClick={() => addItem(product._id)}
          aria-label="Add to cart"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-oceanic hover:text-oceanic"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M5 12h14M12 5v14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
