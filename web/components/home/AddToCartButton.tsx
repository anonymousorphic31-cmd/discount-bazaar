"use client";

import { useState } from "react";
import { useCart } from "@/lib/CartContext";
import type { Product } from "@/lib/types";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() => {
        addItem({
          _id: product._id,
          title: product.title,
          pricing: product.pricing,
          images: product.images,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white transition hover:bg-oceanic-dark sm:w-auto"
    >
      {added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}
