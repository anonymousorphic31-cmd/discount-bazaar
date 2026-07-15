"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { proposeProduct } from "@/lib/api";
import { formatPKR } from "@/lib/format";

interface FormState {
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  marketAnchorPrice: string;
  baseWholesaleCost: string;
  maxDiscountPercent: string;
  maxSquadMembers: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  category: "",
  description: "",
  imageUrl: "",
  marketAnchorPrice: "",
  baseWholesaleCost: "",
  maxDiscountPercent: "",
  maxSquadMembers: "30",
};

const STEPS = ["Product Details", "Pricing", "Review & Submit"] as const;

export function ProposeDealForm({ onSubmitted }: { onSubmitted: (message: string, ok: boolean) => void }) {
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const anchor = Number(form.marketAnchorPrice) || 0;
  const wholesale = Number(form.baseWholesaleCost) || 0;
  const discountPct = Number(form.maxDiscountPercent) || 0;
  const squadSellingPrice = anchor * (1 - discountPct / 100);
  const margin = squadSellingPrice - wholesale;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!form.title.trim()) return "Product title is required.";
      if (!form.category.trim()) return "Category is required.";
      if (!form.description.trim() || form.description.trim().length < 10)
        return "Description must be at least 10 characters.";
    }
    if (current === 1) {
      if (!form.marketAnchorPrice || anchor <= 0) return "Retail anchor price must be greater than 0.";
      if (!form.baseWholesaleCost || wholesale <= 0) return "Base wholesale cost must be greater than 0.";
      if (wholesale > anchor) return "Wholesale cost cannot exceed the retail anchor price.";
      if (!form.maxDiscountPercent || discountPct < 0 || discountPct > 100)
        return "Max discount must be between 0 and 100.";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setValidationError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!token) return;
    setSubmitting(true);
    try {
      await proposeProduct(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
          category: form.category.trim(),
          market_anchor_price: anchor,
          base_wholesale_cost: wholesale,
          max_squad_discount_percent: discountPct,
          maxSquadMembers: Number(form.maxSquadMembers) || 30,
        },
        token,
      );
      onSubmitted("Proposal submitted — an admin will review it shortly.", true);
      setForm(EMPTY_FORM);
      setStep(0);
    } catch (err) {
      onSubmitted(err instanceof Error ? err.message : "Failed to submit proposal.", false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                i <= step ? "bg-oceanic text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {validationError && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{validationError}</div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Product Title">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="input"
              placeholder="e.g. Sony WH-1000XM4 Wireless Headphones"
            />
          </Field>
          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="input"
              placeholder="e.g. Electronics"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="input min-h-24"
              placeholder="Key specs and selling points for buyers."
            />
          </Field>
          <Field label="Image URL (optional)">
            <input
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              className="input"
              placeholder="https://..."
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Retail Anchor Price (PKR)">
            <input
              type="number"
              value={form.marketAnchorPrice}
              onChange={(e) => update("marketAnchorPrice", e.target.value)}
              className="input"
              placeholder="82500"
            />
          </Field>
          <Field label="Base Wholesale Cost (PKR)">
            <input
              type="number"
              value={form.baseWholesaleCost}
              onChange={(e) => update("baseWholesaleCost", e.target.value)}
              className="input"
              placeholder="58000"
            />
          </Field>
          <Field label="Max Squad Discount (%)">
            <input
              type="number"
              value={form.maxDiscountPercent}
              onChange={(e) => update("maxDiscountPercent", e.target.value)}
              className="input"
              placeholder="24"
            />
          </Field>
          <Field label="Target Squad Size">
            <input
              type="number"
              value={form.maxSquadMembers}
              onChange={(e) => update("maxSquadMembers", e.target.value)}
              className="input"
            />
          </Field>

          <SummaryCard anchor={anchor} squadSellingPrice={squadSellingPrice} margin={margin} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-semibold text-slate-900">{form.title || "Untitled product"}</p>
            <p className="text-slate-500">{form.category}</p>
            <p className="mt-2 text-slate-600">{form.description}</p>
          </div>
          <SummaryCard anchor={anchor} squadSellingPrice={squadSellingPrice} margin={margin} />
          <p className="text-xs text-slate-400">
            Submitting sends this proposal to the Admin Proposal Queue. It will not appear on the storefront until
            approved.
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={goNext} className="rounded-lg bg-oceanic px-5 py-2 text-sm font-semibold text-white hover:bg-oceanic-dark">
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-mint px-5 py-2 text-sm font-semibold text-oceanic-dark hover:bg-mint-dark disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit Proposal"}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ anchor, squadSellingPrice, margin }: { anchor: number; squadSellingPrice: number; margin: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl bg-oceanic/5 p-4 text-center">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Retail Price</p>
        <p className="mt-1 font-heading text-sm font-bold text-slate-900">{formatPKR(anchor)}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Squad Selling Price</p>
        <p className="mt-1 font-heading text-sm font-bold text-oceanic">{formatPKR(squadSellingPrice)}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Your Margin</p>
        <p className={`mt-1 font-heading text-sm font-bold ${margin >= 0 ? "text-mint-dark" : "text-red-600"}`}>
          {formatPKR(margin)}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
