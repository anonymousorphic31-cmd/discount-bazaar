/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { initiateEscrowCheckout } from "@/lib/api";
import { formatPKR, squadCurrentPrice, squadDiscountPercent, squadMaxDiscountPercent } from "@/lib/format";
import type { Product, Squad } from "@/lib/types";

export function DualCheckout({ product, activeSquad }: { product: Product; activeSquad: Squad | null }) {
  const { user, token, openLogin } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [isJoining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const { marketAnchorPrice, maxSquadDiscount } = product.pricing;
  const targetMembers = activeSquad?.targetMembers ?? product.maxSquadMembers;
  const currentMembers = activeSquad?.currentMembers ?? 0;

  const unitSquadPrice = squadCurrentPrice(marketAnchorPrice, maxSquadDiscount, currentMembers, targetMembers);
  const totalSquadPrice = unitSquadPrice * quantity;
  const discountPct = squadDiscountPercent(maxSquadDiscount, currentMembers, targetMembers);
  const maxDiscountPct = squadMaxDiscountPercent(maxSquadDiscount);

  const depositPct = product.deposit_percentage ?? 10;
  const depositPerUnit = Math.round(marketAnchorPrice * (depositPct / 100));
  const totalDeposit = depositPerUnit * quantity;
  const remaining = Math.max(0, Math.round(totalSquadPrice - totalDeposit));
  const progress = Math.min(100, Math.round((currentMembers / targetMembers) * 100));
  const isFull = currentMembers >= targetMembers;

  function adjustQty(delta: number) {
    setQuantity((q) => Math.max(1, Math.min(99, q + delta)));
  }

  async function handleJoinSquad() {
    if (!user || !token) {
      openLogin();
      return;
    }

    setError(null);
    setJoining(true);
    try {
      const checkout = await initiateEscrowCheckout(product._id, activeSquad?._id, token, quantity);

      // Redirect to Safepay hosted checkout so the buyer can enter
      // sandbox card details in the interactive payment form.
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }

      // Fallback: no checkout URL — go to dashboard
      router.push("/dashboard?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the Squad checkout.");
      setJoining(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Quantity</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustQty(-1)}
            disabled={quantity <= 1}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-oceanic hover:text-oceanic disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="min-w-8 text-center text-sm font-bold text-slate-800">{quantity}</span>
          <button
            onClick={() => adjustQty(1)}
            disabled={quantity >= 99}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-oceanic hover:text-oceanic disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Card 1 — Buy Now */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Buy Solo</p>
            <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
              {formatPKR(product.pricing.currentRetailPrice * quantity)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {quantity > 1 ? `${quantity} × ${formatPKR(product.pricing.currentRetailPrice)} · ` : ""}Ships immediately at standard retail price.
            </p>
          </div>
          <button
            onClick={() => {
              for (let i = 0; i < quantity; i++) {
                addItem({
                  _id: product._id,
                  title: product.title,
                  pricing: product.pricing,
                  images: product.images,
                });
              }
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            className="mt-4 w-full rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            {added ? "Added to Cart" : "Add to Cart"}
          </button>
        </div>

        {/* Card 2 — Join Squad */}
        <div className="flex flex-col justify-between rounded-2xl border-2 border-oceanic bg-oceanic/5 p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-oceanic">Buy as a Squad</p>
              <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-oceanic-dark">
                {discountPct}% OFF
              </span>
              {isFull && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  LOCKED
                </span>
              )}
            </div>
            <p className="mt-1 text-lg font-bold text-oceanic-dark sm:text-xl">
              {formatPKR(totalSquadPrice)}
            </p>
            {quantity > 1 && (
              <p className="text-xs text-oceanic-dark/70">
                {quantity} × {formatPKR(unitSquadPrice)}
              </p>
            )}

            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-mint" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-oceanic-dark/80">
                {activeSquad
                  ? `${currentMembers}/${targetMembers} joined · ${discountPct}% / ${maxDiscountPct}% unlocked`
                  : "Be the first to start this Squad"}
              </p>
            </div>

            <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Secure 24-Hour Hold</p>
              <p className="mt-1">
                {formatPKR(totalDeposit)} today ({depositPct}% × {quantity} {quantity > 1 ? "units" : "unit"})
              </p>
              <p className="mt-0.5">{formatPKR(remaining)} on delivery (COD)</p>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <button
            onClick={handleJoinSquad}
            disabled={isJoining}
            className="mt-4 w-full rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-oceanic-dark disabled:opacity-60"
          >
            {isJoining ? "Redirecting to Safepay..." : "Join this Squad"}
          </button>
        </div>
      </div>
    </div>
  );
}
