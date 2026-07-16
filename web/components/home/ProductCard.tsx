/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product, Squad } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useCart } from "@/lib/CartContext";
import { fetchActiveSquadForProduct } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [squad, setSquad] = useState<Squad | null>(null);

  useEffect(() => {
    if (!product.dualCheckoutEnabled) return;
    let cancelled = false;
    fetchActiveSquadForProduct(product._id)
      .then((s) => {
        if (!cancelled) setSquad(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product._id, product.dualCheckoutEnabled]);

  const hasSquad = squad?.status === "Gathering";
  const squadPrice = product.pricing.marketAnchorPrice * (1 - product.pricing.maxSquadDiscount);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/products/${product._id}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-400">No image</div>
        )}
      </Link>

      {hasSquad && (
        <span className="absolute left-3 top-3 rounded-full bg-mint px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-oceanic-dark shadow-sm">
          Squad Deal Available
        </span>
      )}

      <div className="flex flex-1 items-start justify-between gap-2 p-4">
        <div className="flex flex-col gap-1">
          <Link href={`/products/${product._id}`}>
            <h3 className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-oceanic">
              {product.title}
            </h3>
          </Link>

          {hasSquad ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 line-through">
                Retail: {formatPKR(product.pricing.currentRetailPrice)}
              </span>
              <span className="text-sm font-bold text-oceanic">
                Squad: {formatPKR(squadPrice)}
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-900">
              {formatPKR(product.pricing.currentRetailPrice)}
            </p>
          )}
        </div>

        <button
          onClick={() =>
            addItem({
              _id: product._id,
              title: product.title,
              pricing: product.pricing,
              images: product.images,
            })
          }
          aria-label="Add to cart"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-oceanic hover:bg-oceanic hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M5 12h14M12 5v14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
