"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { initiateEscrowCheckout, simulateEscrowAuthorization } from "@/lib/api";
import { formatPKR, squadCurrentPrice } from "@/lib/format";
import type { Product, Squad } from "@/lib/types";

export function DualCheckout({ product, activeSquad }: { product: Product; activeSquad: Squad | null }) {
  const { user, token, openLogin } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [isJoining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const { marketAnchorPrice, maxSquadDiscount } = product.pricing;
  const targetMembers = activeSquad?.targetMembers ?? product.maxSquadMembers;
  const currentMembers = activeSquad?.currentMembers ?? 0;
  const squadPrice = squadCurrentPrice(marketAnchorPrice, maxSquadDiscount, currentMembers, targetMembers);
  const deposit = Math.round(marketAnchorPrice * 0.1);
  const remaining = Math.max(0, Math.round(squadPrice - deposit));
  const progress = Math.min(100, Math.round((currentMembers / targetMembers) * 100));

  async function handleJoinToli() {
    if (!user || !token) {
      openLogin();
      return;
    }

    setError(null);
    setJoining(true);
    try {
      const checkout = await initiateEscrowCheckout(product._id, activeSquad?._id, token);
      // No real Safepay gateway is wired up (see src/utils/safepay.ts) — fire
      // the same webhook Safepay would call on a successful authorization so
      // squad membership is actually recorded, not just simulated visually.
      await simulateEscrowAuthorization({
        trackerId: checkout.trackerId,
        amount: checkout.holdAmount,
        productId: checkout.productId,
        squadId: checkout.squadId,
        buyerId: user.id,
      });
      router.push("/dashboard?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the Toli checkout.");
      setJoining(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {/* Card 1 — Buy Now */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Buy Solo</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            Buy Now — {formatPKR(product.pricing.currentRetailPrice)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Ships immediately at standard retail price.</p>
        </div>
        <button
          onClick={() => {
            addItem(product._id);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          className="mt-4 w-full rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          {added ? "Added to Cart ✓" : "Add to Cart"}
        </button>
      </div>

      {/* Card 2 — Join Toli */}
      <div className="flex flex-col justify-between rounded-2xl border-2 border-oceanic bg-oceanic/5 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-oceanic">Buy as a Toli</p>
          <p className="mt-1 text-xl font-bold text-oceanic-dark">Join Toli — {formatPKR(squadPrice)}</p>

          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-mint" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-oceanic-dark/80">
              {activeSquad ? `${currentMembers}/${targetMembers} joined` : "Be the first to start this Toli"}
            </p>
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">🔒 Secure 24-Hour Hold</p>
            <p className="mt-1">
              {formatPKR(deposit)} today · {formatPKR(remaining)} on delivery
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <button
          onClick={handleJoinToli}
          disabled={isJoining}
          className="mt-4 w-full rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-oceanic-dark disabled:opacity-60"
        >
          {isJoining ? "Starting your hold…" : "Join this Toli"}
        </button>
      </div>
    </div>
  );
}
