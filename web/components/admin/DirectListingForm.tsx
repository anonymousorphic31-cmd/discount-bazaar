"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { fetchSuppliers, uploadProductDirect } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { SupplierSummary } from "@/lib/types";

export function DirectListingForm({ onSubmitted }: { onSubmitted: (message: string, ok: boolean) => void }) {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [anchorPrice, setAnchorPrice] = useState("");
  const [wholesaleCost, setWholesaleCost] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchSuppliers(token)
      .then((list) => {
        setSuppliers(list);
        if (list.length > 0) setSupplierId(list[0]._id);
      })
      .catch(() => setSuppliers([]));
  }, [token]);

  const anchor = Number(anchorPrice) || 0;
  const wholesale = Number(wholesaleCost) || 0;
  const discount = Number(discountPct) || 0;
  const squadSellingPrice = anchor * (1 - discount / 100);

  async function handleSubmit() {
    if (!token) return;
    if (!supplierId) {
      onSubmitted("Select a supplier to attribute this listing to.", false);
      return;
    }
    if (!title.trim() || !category.trim() || !description.trim()) {
      onSubmitted("Title, category, and description are required.", false);
      return;
    }
    if (anchor <= 0 || wholesale <= 0) {
      onSubmitted("Retail anchor price and wholesale cost must be greater than 0.", false);
      return;
    }
    setSubmitting(true);
    try {
      await uploadProductDirect(
        {
          title: title.trim(),
          description: description.trim(),
          images: imageUrl.trim() ? [imageUrl.trim()] : [],
          category: category.trim(),
          market_anchor_price: anchor,
          base_wholesale_cost: wholesale,
          max_squad_discount_percent: discount,
          supplierId,
        },
        token,
      );
      onSubmitted("Product published directly to the catalog.", true);
      setTitle("");
      setCategory("");
      setDescription("");
      setImageUrl("");
      setAnchorPrice("");
      setWholesaleCost("");
      setDiscountPct("");
    } catch (err) {
      onSubmitted(err instanceof Error ? err.message : "Failed to publish product.", false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Attribute to Supplier</span>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
          {suppliers.length === 0 && <option value="">No suppliers found</option>}
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.supplierDetails?.companyName ?? s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Product Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Category</span>
        <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-20" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Image URL (optional)</span>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="https://..." />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Retail Anchor (PKR)</span>
          <input type="number" value={anchorPrice} onChange={(e) => setAnchorPrice(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Wholesale Cost (PKR)</span>
          <input type="number" value={wholesaleCost} onChange={(e) => setWholesaleCost(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Max Discount (%)</span>
          <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="input" />
        </label>
      </div>

      <div className="rounded-xl bg-oceanic/5 p-3 text-center text-xs text-slate-600">
        Squad Selling Price at max discount: <span className="font-bold text-oceanic">{formatPKR(squadSellingPrice)}</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full rounded-lg bg-oceanic py-2.5 text-sm font-semibold text-white hover:bg-oceanic-dark disabled:opacity-60"
      >
        {isSubmitting ? "Publishing…" : "Publish to Catalog"}
      </button>
    </div>
  );
}
