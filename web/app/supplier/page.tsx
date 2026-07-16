"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ProposeDealForm } from "@/components/supplier/ProposeDealForm";
import { OrderManifestTable } from "@/components/supplier/OrderManifestTable";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthContext";
import { fetchSupplierManifests, submitSupplierVerification } from "@/lib/api";
import type { ManifestOrder } from "@/lib/types";

type Tab = "propose" | "manifests";

const DROPSHIP_NETWORKS = [
  { value: "", label: "Select your dropship network…" },
  { value: "HHC", label: "HHC Distribution Co." },
  { value: "YourMart", label: "YourMart" },
  { value: "Daraz", label: "Daraz Dropship" },
  { value: "Other", label: "Other / Independent" },
];

function SupplierPortal() {
  const { user, token } = useAuth();
  const { toasts, pushToast, dismissToast } = useToasts();
  const [tab, setTab] = useState<Tab>("propose");
  const [orders, setOrders] = useState<ManifestOrder[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verificationStatus = user?.verificationStatus ?? "Approved";
  const isUnverified = verificationStatus === "Unverified";
  const isPending = verificationStatus === "Pending";
  const isVerified = verificationStatus === "Approved";

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
    const timer = window.setTimeout(() => {
      if (isVerified && tab === "manifests") void loadManifests();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isVerified, tab, loadManifests]);

  if (isUnverified) {
    return <KycForm supplierId={user?.id ?? ""} token={token ?? ""} onSubmitted={() => pushToast("Verification submitted!", "success")} />;
  }

  if (isPending) {
    return <UnderReviewScreen />;
  }

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

function KycForm({ supplierId, token, onSubmitted }: { supplierId: string; token: string; onSubmitted: () => void }) {
  const [dropshipNetworkId, setDropshipNetworkId] = useState("");
  const [cnicNtn, setCnicNtn] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>(["", "", "", ""]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProofUrl(index: number, value: string) {
    setProofUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  async function handleSubmit() {
    setError(null);
    if (!dropshipNetworkId) {
      setError("Please select your dropship network.");
      return;
    }
    if (!cnicNtn.trim()) {
      setError("CNIC / NTN number is required.");
      return;
    }
    setSubmitting(true);
    try {
      const filteredUrls = proofUrls.filter((u) => u.trim());
      await submitSupplierVerification(
        { dropshipNetworkId, cnicNtn: cnicNtn.trim(), businessProofUrls: filteredUrls },
        token,
      );
      onSubmitted();
      // Reload to show the pending state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit verification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mint-dark">
          Business Verification Required
        </div>

        <h1 className="mt-4 font-heading text-3xl font-bold text-slate-900">Verify your business</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Complete your KYC verification to unlock the full supplier dashboard. Your documentation
          will be reviewed by our compliance team.
        </p>

        <div className="mt-8 space-y-6">
          {/* Dropship Network */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dropship Network ID
            </label>
            <select
              value={dropshipNetworkId}
              onChange={(e) => setDropshipNetworkId(e.target.value)}
              className="input"
            >
              {DROPSHIP_NETWORKS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* CNIC / NTN */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              CNIC / NTN Number
            </label>
            <input
              value={cnicNtn}
              onChange={(e) => setCnicNtn(e.target.value)}
              placeholder="e.g. 35202-1234567-8 or NTN-1234567"
              className="input"
            />
          </div>

          {/* Business Proof URLs */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Business Proof / CNIC Images (URLs)
            </label>
            <p className="mb-3 text-xs text-slate-400">
              Paste up to 4 direct image URLs of your CNIC, business registration, or proof documents.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {proofUrls.map((url, i) => (
                <input
                  key={i}
                  value={url}
                  onChange={(e) => updateProofUrl(i, e.target.value)}
                  placeholder={`Proof image ${i + 1} URL`}
                  className="input"
                />
              ))}
            </div>
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-oceanic px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-oceanic/20 transition hover:bg-oceanic-dark disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit Business Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnderReviewScreen() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Application Under Review
        </div>

        <div className="mt-6 grid place-items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-8 w-8">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
        </div>

        <h1 className="mt-6 text-center font-heading text-3xl font-bold text-slate-900">
          Your business documentation is under review
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600">
          Your business documentation is currently under review by our compliance team. Full dashboard access will unlock automatically upon verification approval.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <InfoCard title="Business Details" value="Submitted" />
          <InfoCard title="Verification" value="Pending" />
          <InfoCard title="Portal Access" value="Locked" />
        </div>

        <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600">
          This page is read-only while your application is in review. Once approved, your full supplier tools will appear automatically.
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function SupplierPage() {
  return (
    <RoleGuard role="Supplier">
      <SupplierPortal />
    </RoleGuard>
  );
}
