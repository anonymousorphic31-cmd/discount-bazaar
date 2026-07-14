"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface CartState {
  count: number;
  addItem: (productId: string) => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "discountbazaar.cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw) as string[]);
      } catch {
        // ignore malformed cart
      }
    }
  }, []);

  const value = useMemo<CartState>(
    () => ({
      count: items.length,
      addItem: (productId: string) => {
        setItems((prev) => {
          const next = [...prev, productId];
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
