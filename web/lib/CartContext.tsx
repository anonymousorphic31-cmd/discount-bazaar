"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (product: { _id: string; title: string; pricing: { currentRetailPrice: number }; images: string[] }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "discountbazaar.cart.v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setItems(JSON.parse(raw) as CartItem[]);
        } catch {
          // ignore malformed cart
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addItem = useCallback<CartState["addItem"]>((product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      const next = existing
        ? prev.map((i) => (i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i))
        : [
            ...prev,
            {
              productId: product._id,
              title: product.title,
              price: product.pricing.currentRetailPrice,
              image: product.images[0] ?? "",
              quantity: 1,
            },
          ];
      persist(next);
      return next;
    });
    setIsOpen(true);
  }, [persist]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      persist(next);
      return next;
    });
  }, [persist]);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setItems((prev) => {
      const next = prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0);
      persist(next);
      return next;
    });
  }, [persist]);

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, [persist]);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((v) => !v), []);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  const value = useMemo<CartState>(
    () => ({
      items,
      count,
      subtotal,
      isOpen,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }),
    [items, count, subtotal, isOpen, addItem, removeItem, updateQuantity, clear, openDrawer, closeDrawer, toggleDrawer],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
