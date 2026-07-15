"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { updateOrderTracking } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { ManifestOrder } from "@/lib/types";

function downloadMockLabel(order: ManifestOrder) {
  const content = [
    "DISCOUNTBAZAAR.PK — SHIPPING LABEL (MOCK)",
    "----------------------------------------",
    `Order ID: ${order._id}`,
    `Product: ${order.productId.title}`,
    `Buyer: ${order.buyerId.name} (${order.buyerId.phoneNumber})`,
    `COD Due: ${formatPKR(order.totals.codAmountDue)}`,
    `Generated: ${new Date().toLocaleString("en-PK")}`,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `label-${order._id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrderManifestTable({
  orders,
  onUpdated,
  onNotify,
}: {
  orders: ManifestOrder[];
  onUpdated: (order: ManifestOrder) => void;
  onNotify: (message: string, ok: boolean) => void;
}) {
  const { token } = useAuth();
  const [drafts, setDrafts] = useState<Record<string, { tracking: string; courier: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function draftFor(id: string) {
    return drafts[id] ?? { tracking: "", courier: "" };
  }

  async function handleSave(order: ManifestOrder) {
    if (!token) return;
    const draft = draftFor(order._id);
    if (!draft.tracking.trim()) {
      onNotify("Enter a courier tracking link before saving.", false);
      return;
    }
    setSavingId(order._id);
    try {
      const result = await updateOrderTracking(order._id, draft.tracking.trim(), draft.courier.trim(), token);
      onUpdated({
        ...order,
        trackingNumber: result.trackingNumber,
        courier: result.courier,
        logisticsStatus: result.logisticsStatus as ManifestOrder["logisticsStatus"],
      });
      onNotify("Tracking saved — order moved to Packed.", true);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to save tracking.", false);
    } finally {
      setSavingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No orders awaiting dispatch right now.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Buyer</th>
            <th className="px-4 py-3">COD Due</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Label</th>
            <th className="px-4 py-3">Courier Tracking Link</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-900">{order.productId.title}</td>
              <td className="px-4 py-3 text-slate-600">
                {order.buyerId.name}
                <div className="text-xs text-slate-400">{order.buyerId.phoneNumber}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatPKR(order.totals.codAmountDue)}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-oceanic/10 px-2.5 py-1 text-xs font-medium text-oceanic">
                  {order.logisticsStatus.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => downloadMockLabel(order)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-oceanic hover:text-oceanic"
                >
                  Download Label
                </button>
              </td>
              <td className="px-4 py-3">
                {order.trackingNumber ? (
                  <span className="text-xs text-slate-500">
                    {order.courier ?? "Courier"}: {order.trackingNumber}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draftFor(order._id).tracking}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [order._id]: { ...draftFor(order._id), tracking: e.target.value } }))
                      }
                      placeholder="Tracking link/ID"
                      className="input w-40"
                    />
                    <input
                      value={draftFor(order._id).courier}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [order._id]: { ...draftFor(order._id), courier: e.target.value } }))
                      }
                      placeholder="Courier (optional)"
                      className="input w-28"
                    />
                    <button
                      onClick={() => handleSave(order)}
                      disabled={savingId === order._id}
                      className="rounded-lg bg-oceanic px-3 py-1.5 text-xs font-semibold text-white hover:bg-oceanic-dark disabled:opacity-60"
                    >
                      {savingId === order._id ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
