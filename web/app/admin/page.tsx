"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ProposalQueueTable } from "@/components/admin/ProposalQueueTable";
import { DirectListingForm } from "@/components/admin/DirectListingForm";
import { DisputeLedgerTable } from "@/components/admin/DisputeLedgerTable";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthContext";
import { fetchDisputes, fetchPendingProducts } from "@/lib/api";
import type { Dispute, PendingProduct } from "@/lib/types";

type Tab = "queue" | "listing" | "ledger";

function AdminPortal() {
  const { token } = useAuth();
  const { toasts, pushToast, dismissToast } = useToasts();
  const [tab, setTab] = useState<Tab>("queue");
  const [pending, setPending] = useState<PendingProduct[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setPending(await fetchPendingProducts(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the proposal queue.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadDisputes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setDisputes(await fetchDisputes(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load disputes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (tab === "queue") loadQueue();
    if (tab === "ledger") loadDisputes();
  }, [tab, loadQueue, loadDisputes]);

  return (
    <PortalShell
      title="Admin Command Center"
      subtitle="Administrator"
      tabs={[
        { id: "queue", label: "Proposal Queue" },
        { id: "listing", label: "Direct Listing" },
        { id: "ledger", label: "Conflict Resolution & Ledger" },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      <div className="font-heading">
        {tab === "queue" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Proposal Queue</h1>
            <p className="mt-1 font-body text-sm text-slate-500">Review supplier-submitted products before they go live.</p>
            <div className="mt-6 font-body">
              {isLoading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : (
                <ProposalQueueTable
                  products={pending}
                  onResolved={(id) => setPending((prev) => prev.filter((p) => p._id !== id))}
                  onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")}
                />
              )}
            </div>
          </div>
        )}

        {tab === "listing" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Direct Listing</h1>
            <p className="mt-1 font-body text-sm text-slate-500">Bypass suppliers and inject inventory directly.</p>
            <div className="mt-6 font-body">
              <DirectListingForm onSubmitted={(message, ok) => pushToast(message, ok ? "success" : "error")} />
            </div>
          </div>
        )}

        {tab === "ledger" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Conflict Resolution & Ledger</h1>
            <p className="mt-1 font-body text-sm text-slate-500">Active buyer complaints awaiting resolution.</p>
            <div className="mt-6 font-body">
              {isLoading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : (
                <DisputeLedgerTable
                  disputes={disputes}
                  onResolved={(id) => setDisputes((prev) => prev.filter((d) => d._id !== id))}
                  onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PortalShell>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard role="Admin">
      <AdminPortal />
    </RoleGuard>
  );
}
