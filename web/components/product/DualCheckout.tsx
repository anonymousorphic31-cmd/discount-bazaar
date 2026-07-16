/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { getShippingAddress, initiateEscrowCheckout, saveShippingAddress } from "@/lib/api";
import {
  formatPKR,
  squadCurrentPrice,
  squadDiscountPercent,
  squadMaxDiscountPercent,
} from "@/lib/format";
import { getDeliveryFee } from "@/lib/pakistanLocations";
import type { Product, ShippingAddress, Squad } from "@/lib/types";
import { ShippingAddressForm } from "@/components/checkout/ShippingAddressForm";

type CheckoutStep = "idle" | "address" | "review" | "payment";

export function DualCheckout({ product, activeSquad }: { product: Product; activeSquad: Squad | null }) {
  const { user, token, openLogin } = useAuth();
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State machine
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [address, setAddress] = useState<ShippingAddress | null>(user?.shippingAddress ?? null);
  const [isInitiating, setInitiating] = useState(false);

  // Safepay iframe modal state
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [safepayCheckoutUrl, setSafepayCheckoutUrl] = useState<string | null>(null);

  const { marketAnchorPrice, maxSquadDiscount } = product.pricing;
  const targetMembers = activeSquad?.targetMembers ?? product.maxSquadMembers;
  const currentMembers = activeSquad?.currentMembers ?? 0;

  const unitSquadPrice = squadCurrentPrice(marketAnchorPrice, maxSquadDiscount, currentMembers, targetMembers);
  const subtotal = unitSquadPrice * quantity;
  const discountPct = squadDiscountPercent(maxSquadDiscount, currentMembers, targetMembers);
  const maxDiscountPct = squadMaxDiscountPercent(maxSquadDiscount);

  const depositPct = product.deposit_percentage ?? 10;
  const deliveryFee = address ? getDeliveryFee(address.province, address.city) : 0;
  const totalOrderValue = subtotal + deliveryFee;
  const totalDeposit = Math.round(subtotal * (depositPct / 100));
  const remainingCOD = Math.max(0, totalOrderValue - totalDeposit);
  const progress = Math.min(100, Math.round((currentMembers / targetMembers) * 100));
  const isFull = currentMembers >= targetMembers;

  function adjustQty(delta: number) {
    setQuantity((q) => Math.max(1, Math.min(99, q + delta)));
  }

  // ─── Step 1: User clicks "Join this Squad" ────────────────────────
  async function handleJoinSquad() {
    if (!user || !token) {
      openLogin();
      return;
    }

    setError(null);

    // Step 2 — Address check: fetch latest from backend, show form if missing
    if (!user.shippingAddress && !address) {
      try {
        const fetched = await getShippingAddress(token);
        if (fetched) {
          setAddress(fetched);
          setStep("review");
          return;
        }
      } catch {
        // ignore — will show form
      }
      setStep("address");
      return;
    }

    // Already has address — go straight to review
    setStep("review");
  }

  function handleAddressSaved(addr: ShippingAddress) {
    setAddress(addr);
    setStep("review");
  }

  // ─── Step 4: Payment — initiate Safepay escrow and open iframe ─────
  async function handlePaySecurely() {
    if (!token) return;

    setError(null);
    setInitiating(true);
    try {
      const checkout = await initiateEscrowCheckout(product._id, activeSquad?._id, token, quantity);

      // Construct the Safepay embedded checkout URL using the tracker
      const baseUrl = "https://sandbox.api.getsafepay.com/checkout/pay";
      const successUrl = `${window.location.origin}/dashboard?success=true`;
      const cancelUrl = `${window.location.origin}/products/${product._id}`;
      const checkoutUrl = `${baseUrl}?env=sandbox&beacon=${encodeURIComponent(checkout.trackerId)}&source=custom&order_id=${encodeURIComponent(checkout.trackerId)}&redirect_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

      setSafepayCheckoutUrl(checkoutUrl);
      setPaymentModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the Squad checkout.");
    } finally {
      setInitiating(false);
    }
  }

  function closePaymentModal() {
    setPaymentModalOpen(false);
    setSafepayCheckoutUrl(null);
    setStep("review");
  }

  // ─── Render ────────────────────────────────────────────────────────
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
              {formatPKR(subtotal)}
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
              <p className="mt-0.5">{formatPKR(remainingCOD)} on delivery (COD)</p>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <button
            onClick={handleJoinSquad}
            disabled={isFull}
            className="mt-4 w-full rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-oceanic-dark disabled:opacity-60"
          >
            {isFull ? "Squad Full" : "Join this Squad"}
          </button>
        </div>
      </div>

      {/* ─── Address Modal ─────────────────────────────────────────── */}
      {step === "address" && (
        <Modal onClose={() => setStep("idle")} title="Shipping Address" maxWidth="max-w-lg">
          <p className="mb-4 text-xs text-slate-500">
            We need your delivery address to calculate shipping and finalize your order.
          </p>
          <ShippingAddressForm
            initial={address}
            token={token!}
            onSave={handleAddressSaved}
            onCancel={() => setStep("idle")}
          />
        </Modal>
      )}

      {/* ─── Review / Order Summary ────────────────────────────────── */}
      {step === "review" && address && (
        <Modal onClose={() => setStep("idle")} title="Review Your Order" maxWidth="max-w-md">
          <div className="space-y-4">
            {/* Delivery address summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Delivering to</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{address.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {address.area}, {address.city}, {address.province}
                  </p>
                  <p className="text-xs text-slate-500">{address.streetAddress}</p>
                  {address.landmark && <p className="text-xs text-slate-400">Landmark: {address.landmark}</p>}
                </div>
                <button
                  onClick={() => setStep("address")}
                  className="text-xs font-medium text-oceanic hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <SummaryRow label={`Subtotal (${quantity} × ${formatPKR(unitSquadPrice)})`} value={formatPKR(subtotal)} />
              <SummaryRow label="Delivery Fee" value={formatPKR(deliveryFee)} />
              <div className="my-2 border-t border-dashed border-slate-200" />
              <SummaryRow label="Total Order Value" value={formatPKR(totalOrderValue)} bold />
              <div className="my-2 border-t border-dashed border-slate-200" />
              <SummaryRow
                label={`Upfront Deposit (${depositPct}%)`}
                value={formatPKR(totalDeposit)}
                accent
              />
              <SummaryRow label="Remaining on Delivery (COD)" value={formatPKR(remainingCOD)} />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              onClick={handlePaySecurely}
              disabled={isInitiating}
              className="w-full rounded-full bg-oceanic px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-oceanic-dark disabled:opacity-60"
            >
              {isInitiating ? "Preparing Payment…" : `Pay ${formatPKR(totalDeposit)} Securely`}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Safepay Embedded Checkout Modal ───────────────────────── */}
      {isPaymentModalOpen && safepayCheckoutUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-oceanic">
                  <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span className="text-sm font-semibold text-slate-700">Secure Payment</span>
              </div>
              <button
                onClick={closePaymentModal}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close payment"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={safepayCheckoutUrl}
              className="h-[calc(85vh-49px)] w-full border-0"
              allow="payment"
              title="Safepay Checkout"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable modal shell ──────────────────────────────────────────── */
function Modal({
  children,
  onClose,
  title,
  maxWidth = "max-w-md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? "font-semibold text-slate-700" : "text-slate-500"}`}>{label}</span>
      <span
        className={`text-sm ${bold ? "font-bold text-slate-900" : accent ? "font-bold text-oceanic" : "font-medium text-slate-700"}`}
      >
        {value}
      </span>
    </div>
  );
}
