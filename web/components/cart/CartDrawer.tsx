"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { fetchActiveSquadForProduct, createStandardOrder } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { Product, Squad } from "@/lib/types";

interface CartDrawerProps {
  products: Product[];
}

export function CartDrawer({ products }: CartDrawerProps) {
  const { items, subtotal, isOpen, closeDrawer, removeItem, updateQuantity } = useCart();
  const { token } = useAuth();
  const router = useRouter();
  const [isCheckingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [squadMap, setSquadMap] = useState<Record<string, Squad | null>>({});

  // Fetch active squads for cart items to show upsell nudges
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        items.map(async (item) => {
          const product = products.find((p) => p._id === item.productId);
          if (!product?.dualCheckoutEnabled) return [item.productId, null] as const;
          try {
            const squad = await fetchActiveSquadForProduct(item.productId);
            return [item.productId, squad] as const;
          } catch {
            return [item.productId, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const map: Record<string, Squad | null> = {};
      for (const [id, squad] of entries) map[id] = squad;
      setSquadMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, items, products]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  async function handleCheckout() {
    if (!token) {
      closeDrawer();
      router.push("/products");
      return;
    }
    setCheckingOut(true);
    setError(null);
    try {
      // Create standard orders for all cart items
      for (const item of items) {
        await createStandardOrder({ productId: item.productId, quantity: item.quantity, token });
      }
      router.push("/dashboard?order=success");
      closeDrawer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }

  function handleSwitchToSquad(productId: string) {
    removeItem(productId);
    closeDrawer();
    router.push(`/products/${productId}?action=join-squad`);
  }

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={closeDrawer}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Your Cart ({items.length})
          </h2>
          <button
            onClick={closeDrawer}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close cart"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-50 text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
                  <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
                  <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Your cart is empty</p>
              <button
                onClick={() => {
                  closeDrawer();
                  router.push("/products");
                }}
                className="mt-4 rounded-full bg-oceanic px-5 py-2 text-sm font-semibold text-white hover:bg-oceanic-dark"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const product = products.find((p) => p._id === item.productId);
                const squad = squadMap[item.productId];
                const hasSquadUpsell =
                  product?.dualCheckoutEnabled && squad && squad.status === "Gathering";
                const savings = product
                  ? product.pricing.marketAnchorPrice -
                    product.pricing.marketAnchorPrice * (1 - product.pricing.maxSquadDiscount)
                  : 0;

                return (
                  <div key={item.productId} className="space-y-2">
                    {/* Item row */}
                    <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] text-slate-300">No img</div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-medium text-slate-800">{item.title}</p>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="shrink-0 text-slate-300 transition hover:text-red-500"
                            aria-label="Remove item"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-oceanic hover:text-oceanic"
                              aria-label="Decrease quantity"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                            <span className="min-w-6 text-center text-sm font-semibold text-slate-700">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-oceanic hover:text-oceanic"
                              aria-label="Increase quantity"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                                <path d="M5 12h14M12 5v14" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-sm font-bold text-slate-900">
                            {formatPKR(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Squad upsell nudge */}
                    {hasSquadUpsell && savings > 0 && (
                      <div className="rounded-xl border-2 border-mint bg-mint/10 p-3">
                        <p className="text-xs font-bold text-mint-dark">
                          🔥 Save {formatPKR(savings)} on this item by joining an active Squad instead!
                        </p>
                        <button
                          onClick={() => handleSwitchToSquad(item.productId)}
                          className="mt-2 w-full rounded-full bg-mint px-4 py-2 text-xs font-bold text-oceanic-dark transition hover:bg-mint-dark hover:text-white"
                        >
                          Switch to Squad Buy →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4">
            {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Subtotal</span>
              <span className="font-heading text-xl font-bold text-slate-900">{formatPKR(subtotal)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full rounded-full bg-oceanic px-6 py-3 text-sm font-bold text-white shadow-lg shadow-oceanic/20 transition hover:bg-oceanic-dark disabled:opacity-60"
            >
              {isCheckingOut ? "Processing…" : "Checkout"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Standard retail checkout · COD available
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
