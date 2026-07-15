"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { resolveDispute } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { Dispute } from "@/lib/types";

const ISSUE_LABELS: Record<string, string> = {
  ProductQuality: "Product Quality",
  WrongItem: "Wrong Item",
  DeliveryDelay: "Delivery Delay",
  PaymentIssue: "Payment Issue",
  Other: "Other",
};

export function DisputeLedgerTable({
  disputes,
  onResolved,
  onNotify,
}: {
  disputes: Dispute[];
  onResolved: (disputeId: string) => void;
  onNotify: (message: string, ok: boolean) => void;
}) {
  const { token } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function handle(dispute: Dispute, resolution: "Refund" | "Reject") {
    if (!token) return;
    const note = notes[dispute._id]?.trim();
    if (!note || note.length < 5) {
      onNotify("Add a note (5+ characters) before resolving this ticket.", false);
      return;
    }
    setBusyId(dispute._id);
    try {
      await resolveDispute(dispute._id, resolution, note, token);
      onNotify(
        resolution === "Refund" ? "Refund processed — buyer refunded, ledger voided." : "Ticket routed to dropshipper and closed.",
        true,
      );
      onResolved(dispute._id);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to resolve ticket.", false);
    } finally {
      setBusyId(null);
    }
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No open disputes — the ledger is clean.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((d) => (
        <div key={d._id} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                {ISSUE_LABELS[d.issueType] ?? d.issueType}
              </span>
              <p className="mt-2 text-sm font-medium text-slate-900">
                Buyer: {d.buyerId.name} ({d.buyerId.phoneNumber})
              </p>
              <p className="text-xs text-slate-400">
                Supplier: {d.supplierId.name} · Order total {formatPKR(d.orderId.totals.total)}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{d.status}</span>
          </div>

          <p className="mt-3 text-sm text-slate-700">{d.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={notes[d._id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [d._id]: e.target.value }))}
              placeholder="Admin resolution note…"
              className="input flex-1 min-w-[220px]"
            />
            <button
              onClick={() => handle(d, "Reject")}
              disabled={busyId === d._id}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Route to Dropshipper
            </button>
            <button
              onClick={() => handle(d, "Refund")}
              disabled={busyId === d._id}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Force Refund
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
