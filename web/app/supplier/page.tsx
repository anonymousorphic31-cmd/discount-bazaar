"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ProposeDealForm } from "@/components/supplier/ProposeDealForm";
import { OrderManifestTable } from "@/components/supplier/OrderManifestTable";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthContext";
import { fetchSupplierManifests } from "@/lib/api";
import type { ManifestOrder } from "@/lib/types";

type Tab = "propose" | "manifests";

function SupplierPortal() {
  const { token } = useAuth();
  const { toasts, pushToast, dismissToast } = useToasts();
  const [tab, setTab] = useState<Tab>("propose");
  const [orders, setOrders] = useState<ManifestOrder[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadManifests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchSupplierManifests(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load order manifests.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (tab === "manifests") loadManifests();
  }, [tab, loadManifests]);

  return (
    <PortalShell
      title="Supplier Portal"
      subtitle="Supplier account"
      tabs={[
        { id: "propose", label: "Propose Deal" },
        { id: "manifests", label: "Order Manifests" },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      {tab === "propose" ? (
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Propose a Deal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit a new product for admin review — it goes live once approved.
          </p>
          <div className="mt-6">
            <ProposeDealForm onSubmitted={(message, ok) => pushToast(message, ok ? "success" : "error")} />
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Order Manifests</h1>
          <p className="mt-1 text-sm text-slate-500">Orders ready for dispatch from your catalog.</p>
          <div className="mt-6">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <OrderManifestTable
                orders={orders}
                onUpdated={(updated) => setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)))}
                onNotify={(message, ok) => pushToast(message, ok ? "success" : "error")}
              />
            )}
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PortalShell>
  );
}

export default function SupplierPage() {
  return (
    <RoleGuard role="Supplier">
      <SupplierPortal />
    </RoleGuard>
  );
}
