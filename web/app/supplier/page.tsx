"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PortalShell, type PortalTab } from "@/components/portal/PortalShell";
import { ProposeDealForm } from "@/components/supplier/ProposeDealForm";
import { OrderManifestTable } from "@/components/supplier/OrderManifestTable";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchSupplierManifests,
  fetchSupplierMyDeals,
  submitSupplierVerification,
  updateSupplierStock,
} from "@/lib/api";
import { formatPKR } from "@/lib/format";
import type { ManifestOrder, Product } from "@/lib/types";

type Tab = "verification" | "propose" | "manifests" | "deals";

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
  const [tab, setTab] = useState<Tab>("verification");
  const [orders, setOrders] = useState<ManifestOrder[]>([]);
  const [deals, setDeals] = useState<{ proposed: Product[]; rejected: Product[]; active: Product[] }>({
    proposed: [],
    rejected: [],
    active: [],
  });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verificationStatus = user?.verificationStatus ?? "Unverified";
  const isVerified = verificationStatus === "Verified";

  const allTabs: (PortalTab & { locked?: boolean })[] = [
    { id: "verification", label: "Business Verification", icon: "🛡️" },
    { id: "propose", label: "Propose Deal", icon: "📦", locked: !isVerified },
    { id: "manifests", label: "Order Manifests", icon: "📋", locked: !isVerified },
    { id: "deals", label: "My Deals", icon: "🗂️", locked: !isVerified },
  ];

  function handleTabChange(id: string) {
    const target = allTabs.find((t) => t.id === id);
    if (target?.locked) {
      pushToast("Complete business verification first.", "error");
      return;
    }
    setTab(id as Tab);
  }

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

  const loadDeals = useCallback(async () => {
    if (!token) return;
    try {
      setDeals(await fetchSupplierMyDeals(token));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not load deals.", "error");
    }
  }, [token, pushToast]);

  useEffect(() => {
    if (isVerified && tab === "manifests") {
      const timer = window.setTimeout(() => void loadManifests(), 0);
      return () => window.clearTimeout(timer);
    }
    if (isVerified && tab === "deals") {
      const timer = window.setTimeout(() => void loadDeals(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isVerified, tab, loadManifests, loadDeals]);

  useEffect(() => {
    if (!isVerified) setTab("verification");
  }, [isVerified]);

  function renderTabContent() {
    if (tab === "verification") {
      return (
        <BusinessVerificationTab
          status={verificationStatus}
          adminFeedback={user?.adminFeedback}
          token={token ?? ""}
          email={user?.email ?? ""}
          phoneNumber={user?.phoneNumber ?? ""}
          onSubmitted={() => {
            pushToast("Verification submitted!", "success");
            window.location.reload();
          }}
        />
      );
    }

    if (!isVerified) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            This section unlocks after your business verification is approved.
          </p>
        </div>
      );
    }

    if (tab === "propose") {
      return (
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Propose a Deal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit a new product for admin review — it goes live once approved.
          </p>
          <div className="mt-6">
            <ProposeDealForm onSubmitted={(message, ok) => pushToast(message, ok ? "success" : "error")} />
          </div>
        </div>
      );
    }

    if (tab === "deals") {
      return (
        <MyDealsTab
          deals={deals}
          token={token ?? ""}
          onStockUpdated={(productId, newStock) => {
            setDeals((prev) => ({
              ...prev,
              active: prev.active.map((p) => (p._id === productId ? { ...p, stockAvailable: newStock } : p)),
            }));
            pushToast("Stock updated.", "success");
          }}
          onError={(msg) => pushToast(msg, "error")}
        />
      );
    }

    return (
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
    );
  }

  return (
    <PortalShell
      title="Supplier Portal"
      subtitle="Supplier account"
      tabs={allTabs}
      activeTab={tab}
      onTabChange={handleTabChange}
    >
      {renderTabContent()}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PortalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Business Verification Tab                                          */
/* ------------------------------------------------------------------ */

function BusinessVerificationTab({
  status,
  adminFeedback,
  token,
  email,
  phoneNumber,
  onSubmitted,
}: {
  status: string;
  adminFeedback?: string;
  token: string;
  email: string;
  phoneNumber: string;
  onSubmitted: () => void;
}) {
  if (status === "Verified") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-mint/30 bg-mint/10 p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-7 w-7">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-slate-900">You are verified</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your business is fully verified. All dashboard features are unlocked.
          </p>
        </div>
      </div>
    );
  }

  if (status === "Pending") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-slate-900">Documents under review</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your documents are submitted and under review. No edits can be made at this time.
            Full dashboard access will unlock automatically upon verification approval.
          </p>
        </div>
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-slate-900">Application rejected</h1>
          {adminFeedback && (
            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-red-700">{adminFeedback}</p>
          )}
        </div>
      </div>
    );
  }

  // Unverified or Needs_Correction — show the KYC form
  return (
    <KycForm
      token={token}
      email={email}
      phoneNumber={phoneNumber}
      adminFeedback={adminFeedback}
      onSubmitted={onSubmitted}
    />
  );
}

/* ------------------------------------------------------------------ */
/* KYC Form with OTP + document uploads                                */
/* ------------------------------------------------------------------ */

function KycForm({
  token,
  email,
  phoneNumber,
  adminFeedback,
  onSubmitted,
}: {
  token: string;
  email: string;
  phoneNumber: string;
  adminFeedback?: string;
  onSubmitted: () => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [dropshipNetworkId, setDropshipNetworkId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [cnicNumber, setCnicNumber] = useState("");
  const [cnicFrontUrl, setCnicFrontUrl] = useState("");
  const [cnicBackUrl, setCnicBackUrl] = useState("");
  const [ntnNumber, setNtnNumber] = useState("");
  const [ntnDocUrl, setNtnDocUrl] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [iban, setIban] = useState("");
  const [bankCertUrl, setBankCertUrl] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!emailVerified || !phoneVerified) {
      setError("Both email and phone must be verified via OTP before submitting.");
      return;
    }
    if (!businessName.trim() || !dropshipNetworkId) {
      setError("Business name and dropship network are required.");
      return;
    }
    if (!ownerName.trim() || !cnicNumber.trim() || !cnicFrontUrl.trim() || !cnicBackUrl.trim()) {
      setError("Owner name, CNIC number, and both CNIC images are required.");
      return;
    }
    if (!ntnNumber.trim() || !ntnDocUrl.trim()) {
      setError("NTN number and certificate are required.");
      return;
    }
    if (!accountTitle.trim() || !iban.trim() || !bankCertUrl.trim()) {
      setError("Account title, IBAN, and bank certificate are required.");
      return;
    }

    setSubmitting(true);
    try {
      await submitSupplierVerification(
        {
          contactVerification: { emailVerified, phoneVerified },
          businessInfo: { businessName: businessName.trim(), website: website.trim() || undefined, dropshipNetworkId },
          legalDocs: {
            ownerName: ownerName.trim(),
            cnicNumber: cnicNumber.trim(),
            cnicFrontUrl: cnicFrontUrl.trim(),
            cnicBackUrl: cnicBackUrl.trim(),
            ntnNumber: ntnNumber.trim(),
            ntnDocUrl: ntnDocUrl.trim(),
          },
          bankDetails: { accountTitle: accountTitle.trim(), iban: iban.trim(), bankCertUrl: bankCertUrl.trim() },
        },
        token,
      );
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit verification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {adminFeedback && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Admin Feedback</p>
          <p className="mt-1 text-sm text-amber-800">{adminFeedback}</p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mint-dark">
          Business Verification Required
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-slate-900">Verify your business</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Complete your KYC verification to unlock the full supplier dashboard. Your documentation
          will be reviewed by our compliance team.
        </p>

        <div className="mt-8 space-y-8">
          {/* OTP Verification */}
          <OtpSection
            email={email}
            phoneNumber={phoneNumber}
            emailVerified={emailVerified}
            phoneVerified={phoneVerified}
            onEmailVerified={() => setEmailVerified(true)}
            onPhoneVerified={() => setPhoneVerified(true)}
          />

          {/* Business Info */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Business Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business Name">
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" required />
              </Field>
              <Field label="Website (optional)">
                <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="input" />
              </Field>
              <Field label="Dropship Network">
                <select value={dropshipNetworkId} onChange={(e) => setDropshipNetworkId(e.target.value)} className="input">
                  {DROPSHIP_NETWORKS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Legal Docs */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Legal Documents</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner Full Name">
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="input" required />
              </Field>
              <Field label="CNIC Number">
                <input value={cnicNumber} onChange={(e) => setCnicNumber(e.target.value)} placeholder="35202-1234567-8" className="input" required />
              </Field>
              <Field label="CNIC Front Image URL">
                <input value={cnicFrontUrl} onChange={(e) => setCnicFrontUrl(e.target.value)} placeholder="https://…" className="input" required />
              </Field>
              <Field label="CNIC Back Image URL">
                <input value={cnicBackUrl} onChange={(e) => setCnicBackUrl(e.target.value)} placeholder="https://…" className="input" required />
              </Field>
              <Field label="NTN Number">
                <input value={ntnNumber} onChange={(e) => setNtnNumber(e.target.value)} className="input" required />
              </Field>
              <Field label="NTN Certificate URL">
                <input value={ntnDocUrl} onChange={(e) => setNtnDocUrl(e.target.value)} placeholder="https://…" className="input" required />
              </Field>
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Bank Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account Title">
                <input value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} className="input" required />
              </Field>
              <Field label="IBAN">
                <input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="PK36SCBL0000001123456702" className="input" required />
              </Field>
              <Field label="Bank Maintenance Certificate URL">
                <input value={bankCertUrl} onChange={(e) => setBankCertUrl(e.target.value)} placeholder="https://…" className="input" required />
              </Field>
            </div>
          </section>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-oceanic px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-oceanic/20 transition hover:bg-oceanic-dark disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OTP Section (mocked)                                               */
/* ------------------------------------------------------------------ */

function OtpSection({
  email,
  phoneNumber,
  emailVerified,
  phoneVerified,
  onEmailVerified,
  onPhoneVerified,
}: {
  email: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onEmailVerified: () => void;
  onPhoneVerified: () => void;
}) {
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function sendEmailOtp() {
    // Mock: generate a 6-digit code, display it
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setEmailSent(true);
    setError(null);
    console.info(`[mock OTP] email ${email}: ${code}`);
    alert(`Demo email OTP: ${code}`);
  }

  function sendPhoneOtp() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPhoneSent(true);
    setError(null);
    console.info(`[mock OTP] phone ${phoneNumber}: ${code}`);
    alert(`Demo phone OTP: ${code}`);
  }

  function verifyEmailOtp() {
    if (emailOtp.length !== 6) {
      setError("Enter the 6-digit email code.");
      return;
    }
    onEmailVerified();
    setError(null);
  }

  function verifyPhoneOtp() {
    if (phoneOtp.length !== 6) {
      setError("Enter the 6-digit phone code.");
      return;
    }
    onPhoneVerified();
    setError(null);
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Contact Verification (OTP)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Email OTP */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Email</p>
            {emailVerified && <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint-dark">Verified</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{email || "—"}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={sendEmailOtp}
              disabled={emailVerified || !email}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {emailSent ? "Resend" : "Send OTP"}
            </button>
            <input
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit"
              className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm"
              disabled={emailVerified}
            />
            <button
              onClick={verifyEmailOtp}
              disabled={emailVerified || !emailSent}
              className="rounded-lg bg-oceanic px-3 py-2 text-xs font-medium text-white transition hover:bg-oceanic-dark disabled:opacity-50"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Phone OTP */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Phone</p>
            {phoneVerified && <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint-dark">Verified</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{phoneNumber || "—"}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={sendPhoneOtp}
              disabled={phoneVerified || !phoneNumber}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {phoneSent ? "Resend" : "Send OTP"}
            </button>
            <input
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit"
              className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm"
              disabled={phoneVerified}
            />
            <button
              onClick={verifyPhoneOtp}
              disabled={phoneVerified || !phoneSent}
              className="rounded-lg bg-oceanic px-3 py-2 text-xs font-medium text-white transition hover:bg-oceanic-dark disabled:opacity-50"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* My Deals Tab — proposed / rejected / active + stock editing         */
/* ------------------------------------------------------------------ */

function MyDealsTab({
  deals,
  token,
  onStockUpdated,
  onError,
}: {
  deals: { proposed: Product[]; rejected: Product[]; active: Product[] };
  token: string;
  onStockUpdated: (productId: string, newStock: number) => void;
  onError: (msg: string) => void;
}) {
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function saveStock(productId: string) {
    const newStock = stockEdits[productId];
    if (newStock === undefined || newStock < 0) return;
    setSaving(productId);
    try {
      await updateSupplierStock(productId, newStock, token);
      onStockUpdated(productId, newStock);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update stock.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">My Deals</h1>
        <p className="mt-1 text-sm text-slate-500">Track proposed, rejected, and active deals. Update stock for active products.</p>
      </div>

      {/* Active */}
      <DealGroup
        title="Active Deals"
        products={deals.active}
        accent="emerald"
        emptyText="No active deals yet."
        renderExtra={(p) => (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Stock:</span>
            <input
              type="number"
              min={0}
              value={stockEdits[p._id] ?? p.stockAvailable ?? 0}
              onChange={(e) => setStockEdits((prev) => ({ ...prev, [p._id]: Number(e.target.value) }))}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
            <button
              onClick={() => void saveStock(p._id)}
              disabled={saving === p._id}
              className="rounded-lg bg-oceanic px-3 py-1 text-xs font-medium text-white transition hover:bg-oceanic-dark disabled:opacity-50"
            >
              {saving === p._id ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      />

      {/* Proposed */}
      <DealGroup
        title="Proposed (Awaiting Admin Review)"
        products={deals.proposed}
        accent="amber"
        emptyText="No proposed deals awaiting review."
      />

      {/* Rejected */}
      <DealGroup
        title="Rejected Deals"
        products={deals.rejected}
        accent="red"
        emptyText="No rejected deals."
      />
    </div>
  );
}

function DealGroup({
  title,
  products,
  accent,
  emptyText,
  renderExtra,
}: {
  title: string;
  products: Product[];
  accent: "emerald" | "amber" | "red";
  emptyText: string;
  renderExtra?: (p: Product) => React.ReactNode;
}) {
  const borderClass = {
    emerald: "border-emerald-200",
    amber: "border-amber-200",
    red: "border-red-200",
  }[accent];

  return (
    <div className={`rounded-2xl border ${borderClass} bg-white p-5 shadow-sm`}>
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {products.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p._id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{p.title}</p>
              <p className="mt-1 text-xs text-slate-500">{formatPKR(p.pricing.marketAnchorPrice)} retail</p>
              <p className="text-xs text-slate-500">Max discount: {p.pricing.maxSquadDiscount * 100}%</p>
              {renderExtra?.(p)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function SupplierPage() {
  return (
    <RoleGuard role="Supplier">
      <SupplierPortal />
    </RoleGuard>
  );
}
