"use client";

import { useCallback, useEffect, useState } from "react";
import { adminCancelOrder, adminFetchDispatchedOrders } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { ManifestOrder } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

export function DispatchedOrdersPanel({ onNotify }: { onNotify: (msg: string, ok: boolean) => void }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState<ManifestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await adminFetchDispatchedOrders(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dispatched orders.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel(orderId: string) {
    if (!token) return;
    if (!confirm("Cancel this order? The buyer's deposit hold will be voided.")) return;
    setCancelling(orderId);
    try {
      await adminCancelOrder(orderId, token);
      onNotify("Order cancelled. Buyer's deposit voided.", true);
      await load();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not cancel order.", false);
    } finally {
      setCancelling(null);
    }
  }

  const statusColors: Record<string, string> = {
    PendingDispatch: "bg-amber-100 text-amber-700",
    Packed: "bg-blue-100 text-blue-700",
    Shipped: "bg-indigo-100 text-indigo-700",
    OutForDelivery: "bg-purple-100 text-purple-700",
    Delivered: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-700",
    Returned: "bg-slate-200 text-slate-600",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dispatched Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Full visibility into every order dispatched to suppliers. Cancel any order to void the buyer's deposit.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading orders…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="text-sm text-slate-400">No orders dispatched yet.</p>
      )}

      {orders.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Logistics</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const row = o as unknown as {
                  _id: string;
                  productId?: { title: string };
                  supplierId?: { name: string; phoneNumber: string; email: string };
                  buyerId?: { name: string; phoneNumber: string };
                  totals?: { quantity: number; total: number };
                  logisticsStatus: string;
                  createdAt: string;
                };
                const product = row.productId;
                const supplier = row.supplierId;
                const buyer = row.buyerId;
                const isTerminal = row.logisticsStatus === "Delivered" || row.logisticsStatus === "Cancelled" || row.logisticsStatus === "Returned";
                return (
                  <tr key={o._id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{product?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{supplier?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{supplier?.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{buyer?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{buyer?.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.totals?.quantity ?? 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatPKR(row.totals?.total ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[row.logisticsStatus] ?? "bg-slate-100 text-slate-500"}`}>
                        {row.logisticsStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isTerminal && (
                        <button
                          onClick={() => void handleCancel(row._id)}
                          disabled={cancelling === row._id}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancelling === row._id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
