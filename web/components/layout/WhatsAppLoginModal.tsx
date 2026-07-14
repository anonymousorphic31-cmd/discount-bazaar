"use client";

import { useState } from "react";
import { sendWhatsappOtp, verifyWhatsappOtp } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

type Step = "phone" | "otp";

export function WhatsAppLoginModal() {
  const { isLoginOpen, closeLogin, login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  if (!isLoginOpen) return null;

  function reset() {
    setStep("phone");
    setPhoneNumber("");
    setOtp("");
    setName("");
    setError(null);
  }

  async function handleSendOtp() {
    setError(null);
    setSubmitting(true);
    try {
      await sendWhatsappOtp(phoneNumber);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyWhatsappOtp(phoneNumber, otp, name);
      login(result.token, result.user as unknown as Parameters<typeof login>[1]);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            Login via WhatsApp
          </h2>
          <button
            onClick={() => {
              closeLogin();
              reset();
            }}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {step === "phone" ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              We&apos;ll send a one-time code to your WhatsApp number.
            </p>
            <input
              type="tel"
              placeholder="+923001234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-oceanic focus:outline-none"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={isSubmitting || !phoneNumber}
              className="w-full rounded-lg bg-oceanic px-4 py-2 text-sm font-medium text-white transition hover:bg-oceanic-dark disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send code"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Enter the code sent to <span className="font-medium text-slate-700">{phoneNumber}</span>.
            </p>
            <input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-oceanic focus:outline-none"
            />
            <input
              type="text"
              placeholder="Your name (first time only)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-oceanic focus:outline-none"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={isSubmitting || !otp}
              className="w-full rounded-lg bg-oceanic px-4 py-2 text-sm font-medium text-white transition hover:bg-oceanic-dark disabled:opacity-50"
            >
              {isSubmitting ? "Verifying…" : "Verify & continue"}
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Use a different number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
