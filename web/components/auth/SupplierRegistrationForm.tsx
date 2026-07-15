"use client";

import { useState, type FormEvent } from "react";
import { registerSupplierApplication } from "@/lib/api";

export function SupplierRegistrationForm() {
  const [businessName, setBusinessName] = useState("");
  const [dropshipNetworkId, setDropshipNetworkId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [cnicNtn, setCnicNtn] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await registerSupplierApplication({
        businessName,
        dropshipNetworkId,
        contactNumber,
        cnicNtn,
      });
      setMessage(result.message);
      setBusinessName("");
      setDropshipNetworkId("");
      setContactNumber("");
      setCnicNtn("");
      setDocuments(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Section title="Business Identity" icon="▣">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business Name">
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Al-Fatah Trading"
              className="input"
            />
          </Field>
          <Field label="Dropship Network ID">
            <input
              value={dropshipNetworkId}
              onChange={(e) => setDropshipNetworkId(e.target.value)}
              placeholder="Select Network"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Verification & Contact" icon="◉">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact Number">
            <input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+92 3XX XXXXXXX"
              className="input"
            />
          </Field>
          <Field label="CNIC / NTN Number">
            <input
              value={cnicNtn}
              onChange={(e) => setCnicNtn(e.target.value)}
              placeholder="42XXX-XXXXXXX-X"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Compliance Documents" icon="⇪">
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-oceanic hover:bg-oceanic/5">
          <input
            type="file"
            className="hidden"
            onChange={(e) => setDocuments(e.target.files?.[0] ?? null)}
            accept=".pdf,.png,.jpg,.jpeg"
          />
          <div className="rounded-full border border-slate-200 bg-white p-3 text-slate-500 shadow-sm">↑</div>
          <p className="mt-3 text-sm font-medium text-slate-700">Upload Business Registration Proof</p>
          <p className="mt-1 text-xs text-slate-400">PDF, PNG, or JPG (Max 5MB)</p>
          {documents && <p className="mt-2 text-xs font-medium text-oceanic">{documents.name}</p>}
        </label>
      </Section>

      {message && <p className="rounded-2xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint-dark">{message}</p>}
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00d46a] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-[#00be5e] disabled:opacity-60"
      >
        {isSubmitting ? "Submitting…" : "Apply as Supplier"}
        <span aria-hidden>→</span>
      </button>

      <p className="text-center text-xs text-slate-500">
        By applying, you agree to our <span className="font-medium text-slate-700">Terms of Service</span> and <span className="font-medium text-slate-700">Privacy Policy</span>
      </p>
    </form>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-xs text-slate-500">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      </div>
      {children}
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
