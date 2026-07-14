"use client";

import { useState } from "react";
import { useCart } from "@/lib/CartContext";

export function AddToCartButton({ productId }: { productId: string }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() => {
        addItem(productId);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white transition hover:bg-oceanic-dark sm:w-auto"
    >
      {added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}
