"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ProposalQueueTable } from "@/components/admin/ProposalQueueTable";
import { DirectListingForm } from "@/components/admin/DirectListingForm";
import { DisputeLedgerTable } from "@/components/admin/DisputeLedgerTable";
import { ProductManagementPanel } from "@/components/admin/ProductManagementPanel";
import { SupplierApplicationsPanel } from "@/components/admin/SupplierApplicationsPanel";
import { SquadOperationsPanel } from "@/components/admin/SquadOperationsPanel";
import { FinanceLedgerPanel } from "@/components/admin/FinanceLedgerPanel";
import { CustomerDirectoryPanel } from "@/components/admin/CustomerDirectoryPanel";
import { DispatchedOrdersPanel } from "@/components/admin/DispatchedOrdersPanel";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthContext";
import { fetchDisputes, fetchPendingProducts } from "@/lib/api";
import type { Dispute, PendingProduct } from "@/lib/types";

type Tab = "overview" | "products" | "applications" | "queue" | "listing" | "ledger" | "squads" | "finance" | "customers" | "orders";

function AdminPortal() {
  const { token } = useAuth();
  const { toasts, pushToast, dismissToast } = useToasts();
  const [tab, setTab] = useState<Tab>("overview");
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
    const timer = window.setTimeout(() => {
      if (tab === "queue") void loadQueue();
      if (tab === "ledger") void loadDisputes();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [tab, loadQueue, loadDisputes]);

  return (
    <PortalShell
      title="Admin Command Center"
      subtitle="Administrator"
      tabs={[
        { id: "overview", label: "Overview", icon: "▦" },
        { id: "products", label: "Products", icon: "▣" },
        { id: "applications", label: "Supplier Registrations", icon: "◉" },
        { id: "queue", label: "Proposal Queue", icon: "⇄" },
        { id: "listing", label: "Direct Listing", icon: "✚" },
        { id: "squads", label: "Squad Operations", icon: "⬚" },
        { id: "finance", label: "Financial Ledger", icon: "₨" },
        { id: "customers", label: "Customer Directory", icon: "☻" },
        { id: "orders", label: "Dispatched Orders", icon: "➤" },
        { id: "ledger", label: "Conflict Resolution", icon: "⚖" },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      <div className="font-heading">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-oceanic via-oceanic to-oceanic-dark p-8 text-white shadow-2xl">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-mint/10 blur-3xl" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Premium Admin Console</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
                Command Center
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
                Manage the live catalog, review supplier onboarding, and keep disputes under control.
                This dashboard is fully isolated from the public storefront.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <StatCard
                title="Catalog Control"
                description="Add, edit, or delete products from the dashboard."
                icon="▣"
                onClick={() => setTab("products")}
              />
              <StatCard
                title="Supplier Review"
                description="Approve or reject applications, send messages to suppliers."
                icon="◉"
                onClick={() => setTab("applications")}
              />
              <StatCard
                title="Operations"
                description="Monitor disputes, direct listings, and proposal approvals."
                icon="⚖"
                onClick={() => setTab("ledger")}
              />
            </div>
          </div>
        )}

        {tab === "products" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Products</h1>
              <p className="mt-1 font-body text-sm text-slate-500">Review every product in the catalog, then edit or remove them from the live storefront.</p>
            </div>
            <ProductManagementPanel onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")} />
          </div>
        )}

        {tab === "applications" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Supplier Registrations</h1>
              <p className="mt-1 font-body text-sm text-slate-500">Review business applications, approve or reject them, and send messages to the supplier&apos;s email.</p>
            </div>
            <SupplierApplicationsPanel onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")} />
          </div>
        )}

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

        {tab === "squads" && (
          <SquadOperationsPanel onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")} />
        )}

        {tab === "finance" && <FinanceLedgerPanel />}

        {tab === "customers" && (
          <CustomerDirectoryPanel onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")} />
        )}

        {tab === "orders" && (
          <DispatchedOrdersPanel onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")} />
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

function StatCard({ title, description, icon, onClick }: { title: string; description: string; icon: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-lg hover:border-oceanic/30"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-oceanic/10 text-lg text-oceanic transition group-hover:bg-oceanic group-hover:text-white">
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oceanic">{title}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </button>
  );
}
