"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { fetchSupplierApplications, messageSupplier, resolveSupplierApplication } from "@/lib/api";
import type { SupplierApplication } from "@/lib/types";

type ReviewAction = "Approve" | "Reject" | "Request_Changes";

export function SupplierApplicationsPanel({
  onNotify,
}: {
  onNotify: (message: string, ok: boolean) => void;
}) {
  const { token } = useAuth();
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<SupplierApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          setApplications(await fetchSupplierApplications(token));
        } catch (err) {
          onNotify(err instanceof Error ? err.message : "Could not load supplier applications.", false);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onNotify, token]);

  function openReview(app: SupplierApplication, action: ReviewAction) {
    setReviewing(app);
    setReviewAction(action);
    setReviewFeedback(feedback[app._id] ?? app.adminFeedback ?? "");
  }

  async function confirmReview() {
    if (!reviewing || !reviewAction || !token) return;
    setSubmitting((prev) => ({ ...prev, [reviewing._id]: true }));
    try {
      await resolveSupplierApplication(
        reviewing._id,
        { action: reviewAction, feedback: reviewFeedback.trim() || undefined },
        token,
      );
      setApplications((prev) =>
        prev.filter((a) => a._id !== reviewing._id),
      );
      onNotify(
        reviewAction === "Approve"
          ? "Supplier verified and approved."
          : reviewAction === "Reject"
            ? "Supplier application rejected."
            : "Changes requested from supplier.",
        true,
      );
      setReviewing(null);
      setReviewAction(null);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not resolve the application.", false);
    } finally {
      setSubmitting((prev) => ({ ...prev, [reviewing._id]: false }));
    }
  }

  async function handleSendMessage(applicationId: string): Promise<void> {
    if (!token) return;
    const msg = messages[applicationId]?.trim();
    if (!msg) {
      onNotify("Please enter a message to send.", false);
      return;
    }
    setSubmitting((prev) => ({ ...prev, [`${applicationId}_msg`]: true }));
    try {
      const result = await messageSupplier(applicationId, msg, token);
      onNotify(`Message sent to ${result.sentTo}.`, true);
      setMessages((prev) => ({ ...prev, [applicationId]: "" }));
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not send the message.", false);
    } finally {
      setSubmitting((prev) => ({ ...prev, [`${applicationId}_msg`]: false }));
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-heading text-lg font-bold text-slate-900">Supplier Verification Queue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review submitted KYC documents. Approve, reject permanently, or request changes with specific feedback.
        </p>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No pending supplier applications.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map((application) => {
              const isExpanded = expandedId === application._id;
              return (
                <div key={application._id} className="rounded-2xl border border-slate-200 transition hover:shadow-md">
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {application.businessInfo?.businessName ?? application.supplierDetails?.companyName ?? application.name}
                        </h3>
                        <StatusPill status={application.verificationStatus} />
                      </div>
                      <p className="text-sm text-slate-500">
                        {application.phoneNumber}
                        {application.email ? ` · ${application.email}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        {application.businessInfo?.dropshipNetworkId && (
                          <span>Network: <span className="font-medium text-slate-700">{application.businessInfo.dropshipNetworkId}</span></span>
                        )}
                        {application.legalDocs?.cnicNumber && (
                          <span>CNIC: <span className="font-medium text-slate-700">{application.legalDocs.cnicNumber}</span></span>
                        )}
                        {application.legalDocs?.ntnNumber && (
                          <span>NTN: <span className="font-medium text-slate-700">{application.legalDocs.ntnNumber}</span></span>
                        )}
                      </div>
                      {/* Document links */}
                      {application.legalDocs && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {application.legalDocs.cnicFrontUrl && (
                            <DocLink href={application.legalDocs.cnicFrontUrl} label="CNIC Front" />
                          )}
                          {application.legalDocs.cnicBackUrl && (
                            <DocLink href={application.legalDocs.cnicBackUrl} label="CNIC Back" />
                          )}
                          {application.legalDocs.ntnDocUrl && (
                            <DocLink href={application.legalDocs.ntnDocUrl} label="NTN Certificate" />
                          )}
                          {application.bankDetails?.bankCertUrl && (
                            <DocLink href={application.bankDetails.bankCertUrl} label="Bank Certificate" />
                          )}
                        </div>
                      )}
                      {application.createdAt && (
                        <p className="text-xs text-slate-400">
                          Submitted {new Date(application.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 lg:min-w-[220px]">
                      <button
                        onClick={() => openReview(application, "Approve")}
                        disabled={isSubmitting[application._id]}
                        className="w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => openReview(application, "Request_Changes")}
                        disabled={isSubmitting[application._id]}
                        className="w-full rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        ⚠️ Request Changes
                      </button>
                      <button
                        onClick={() => openReview(application, "Reject")}
                        disabled={isSubmitting[application._id]}
                        className="w-full rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        ❌ Reject (Permanent)
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : application._id)}
                        className="flex items-center justify-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide" : "Send Message"}
                        <span className={`transition ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Message to Supplier
                            {application.email && <span className="ml-2 normal-case text-slate-400">({application.email})</span>}
                          </label>
                          <textarea
                            value={messages[application._id] ?? ""}
                            onChange={(e) => setMessages((prev) => ({ ...prev, [application._id]: e.target.value }))}
                            placeholder="Type a message to send to the supplier's email..."
                            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-oceanic focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => void handleSendMessage(application._id)}
                          disabled={isSubmitting[`${application._id}_msg`]}
                          className="shrink-0 rounded-full bg-oceanic px-5 py-3 text-xs font-semibold text-white transition hover:bg-oceanic-dark disabled:opacity-50"
                        >
                          {isSubmitting[`${application._id}_msg`] ? "Sending…" : "Send Message"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      {reviewing && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReviewing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-800">
                {reviewAction === "Approve" && "Approve Supplier"}
                {reviewAction === "Reject" && "Reject Supplier (Permanent)"}
                {reviewAction === "Request_Changes" && "Request Changes"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {reviewing.businessInfo?.businessName ?? reviewing.name}
              </p>
            </div>
            <div className="space-y-4 p-5">
              {(reviewAction === "Request_Changes" || reviewAction === "Reject") && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    {reviewAction === "Request_Changes" ? "Feedback for supplier (required)" : "Reason (optional)"}
                  </span>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder={reviewAction === "Request_Changes" ? "e.g. The CNIC image is blurry, please re-upload" : "Optional reason for rejection…"}
                    className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-oceanic focus:outline-none"
                  />
                </label>
              )}
              {reviewAction === "Approve" && (
                <p className="text-sm text-slate-600">
                  This supplier will be marked as Verified and given full dashboard access.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewing(null)}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void confirmReview()}
                  disabled={isSubmitting[reviewing._id] || (reviewAction === "Request_Changes" && !reviewFeedback.trim())}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 ${
                    reviewAction === "Approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : reviewAction === "Reject"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {isSubmitting[reviewing._id] ? "Saving…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-oceanic/20 bg-oceanic/5 px-2.5 py-1 text-[11px] font-medium text-oceanic transition hover:bg-oceanic/10"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
        <path d="M14 3h7v7M21 3l-9 9M10 21H3v-7" />
      </svg>
      {label}
    </a>
  );
}

function StatusPill({ status }: { status: SupplierApplication["verificationStatus"] }) {
  const classes =
    status === "Verified"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Rejected"
        ? "bg-red-50 text-red-700"
        : status === "Needs_Correction"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
}
