"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { approveProduct, rejectProduct } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { PendingProduct } from "@/lib/types";

export function ProposalQueueTable({
  products,
  onResolved,
  onNotify,
}: {
  products: PendingProduct[];
  onResolved: (productId: string) => void;
  onNotify: (message: string, ok: boolean) => void;
}) {
  const { token } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handle(id: string, action: "approve" | "reject") {
    if (!token) return;
    setBusyId(id);
    try {
      if (action === "approve") {
        await approveProduct(id, token);
        onNotify("Product approved and published to the catalog.", true);
      } else {
        await rejectProduct(id, token);
        onNotify("Proposal rejected.", true);
      }
      onResolved(id);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Action failed.", false);
    } finally {
      setBusyId(null);
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No pending proposals — the queue is clear.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Retail Anchor</th>
            <th className="px-4 py-3">Wholesale Cost</th>
            <th className="px-4 py-3">Max Discount</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 text-slate-600">
                {p.supplierId.supplierDetails?.companyName ?? p.supplierId.name}
                <div className="text-xs text-slate-400">{p.supplierId.phoneNumber}</div>
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
              <td className="px-4 py-3 text-slate-600">{formatPKR(p.pricing.marketAnchorPrice)}</td>
              <td className="px-4 py-3 text-slate-600">{formatPKR(p.pricing.baseWholesaleCost)}</td>
              <td className="px-4 py-3 text-slate-600">{Math.round(p.pricing.maxSquadDiscount * 100)}%</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handle(p._id, "reject")}
                    disabled={busyId === p._id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handle(p._id, "approve")}
                    disabled={busyId === p._id}
                    className="rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-oceanic-dark hover:bg-mint-dark disabled:opacity-60"
                  >
                    Approve
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
