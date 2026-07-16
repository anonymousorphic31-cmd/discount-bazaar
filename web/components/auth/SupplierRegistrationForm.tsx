"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registerSupplierApplication, verifySupplierOtp } from "@/lib/api";

type Step = "register" | "otp" | "success";

export function SupplierRegistrationForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("register");
  const [businessName, setBusinessName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!businessName.trim() || !contactNumber.trim() || !email.trim() || !password) {
      setError("All fields are required.");
      return;
    }
    if (!/^\+?\d{10,15}$/.test(contactNumber.trim())) {
      setError("Contact number must be a valid phone number (e.g. +923XXXXXXXXX).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerSupplierApplication({
        businessName: businessName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        password,
      });
      if (result.devOtp) setDevOtp(result.devOtp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otp.trim()) {
      setError("Please enter the OTP sent to your contact number.");
      return;
    }
    setSubmitting(true);
    try {
      await verifySupplierOtp(contactNumber.trim(), otp.trim());
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-mint/15 px-6 py-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-mint text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-6 w-6">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-heading text-lg font-bold text-slate-900">Registration Successful!</p>
          <p className="mt-2 text-sm text-slate-600">
            Your supplier account has been created. Please log in to complete your business verification.
          </p>
        </div>
        <button
          onClick={() => router.push("/supplier/login")}
          className="w-full rounded-2xl bg-oceanic px-4 py-3 text-sm font-semibold text-white transition hover:bg-oceanic-dark"
        >
          Go to Supplier Login →
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-oceanic">OTP Verification</p>
          <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">Verify your contact number</h3>
          <p className="mt-2 text-sm text-slate-500">
            We sent a 6-digit code to <span className="font-medium text-slate-700">{contactNumber}</span>.
          </p>
          {devOtp && (
            <div className="mt-3 rounded-xl bg-mint/15 px-4 py-2 text-sm text-mint-dark">
              Demo OTP: <span className="font-bold tracking-wider">{devOtp}</span>
            </div>
          )}
        </div>

        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit code"
          className="input text-center text-lg tracking-widest"
          maxLength={6}
          autoFocus
        />

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-mint px-4 py-3 text-sm font-bold text-oceanic-dark transition hover:bg-mint-dark hover:text-white disabled:opacity-60"
        >
          {isSubmitting ? "Verifying…" : "Verify OTP"}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep("register");
            setOtp("");
            setError(null);
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
        >
          ← Back to registration
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      <Field label="Business Name">
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Al-Fatah Trading"
          className="input"
          required
        />
      </Field>

      <Field label="Contact Number">
        <input
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="+92 3XX XXXXXXX"
          className="input"
          required
        />
      </Field>

      <Field label="Email Address">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="supplier@business.pk"
          className="input"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="input"
            required
          />
        </Field>
        <Field label="Confirm Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="input"
            required
          />
        </Field>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-mint px-4 py-3 text-sm font-bold text-oceanic-dark shadow-lg shadow-mint/20 transition hover:bg-mint-dark hover:text-white disabled:opacity-60"
      >
        {isSubmitting ? "Sending OTP…" : "Register & Send OTP"}
        <span aria-hidden> →</span>
      </button>

      <p className="text-center text-xs text-slate-500">
        By applying, you agree to our <span className="font-medium text-slate-700">Terms of Service</span> and{" "}
        <span className="font-medium text-slate-700">Privacy Policy</span>
      </p>
    </form>
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
