import Link from "next/link";
import type { Metadata } from "next";
import { SupplierRegistrationForm } from "@/components/auth/SupplierRegistrationForm";

export const metadata: Metadata = {
  title: "Become a Supplier | DiscountBazaar.PK",
};

export default function SupplierRegisterPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.08fr]">
      {/* Left brand panel */}
      <section className="relative hidden overflow-hidden bg-[#0f4c81] p-8 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -left-16 top-0 h-52 w-52 rounded-full bg-mint/15 blur-3xl" />
        <div className="absolute -bottom-20 right-[-30px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-base font-bold text-white">D</span>
            <span className="font-heading text-xl font-bold tracking-tight">
              DiscountBazaar<span className="text-mint">.PK</span>
            </span>
          </Link>
        </div>

        <div className="relative">
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Trusted by 500+ suppliers
          </div>
          <h1 className="mt-6 max-w-md font-heading text-5xl font-black leading-[0.95] tracking-tight">
            Scale Your <span className="text-mint">B2B Reach.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/80">
            Join Pakistan&apos;s most efficient social commerce node. Zero inventory risk, automated logistics, and bulk clearance workflows built for serious suppliers.
          </p>

          <div className="mt-8 grid gap-4">
            <FeatureRow title="Zero CAC" description="Acquire qualified buyers without spending on expensive marketing campaigns." />
            <FeatureRow title="Automated Logistics" description="Integrated dropshipping networks keep dispatch moving while you focus on supply." />
            <FeatureRow title="Bulk Clearances" description="Move large inventory through decentralized member-buying loops." />
          </div>
        </div>

        <div className="relative mt-10 rounded-3xl border border-white/10 bg-white/8 p-4 text-xs text-white/70 backdrop-blur">
          Submit your business details, network ID, and compliance documents to apply for supplier access.
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex flex-col bg-offwhite">
        <div className="flex justify-end px-6 pt-6 sm:px-8">
          <Link
            href="/supplier/login"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-oceanic hover:text-oceanic"
          >
            Sign In
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
          <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/30 sm:p-6 lg:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-oceanic">Supplier Registration</p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-slate-900">Create your supplier account</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Start with basic credentials — you&apos;ll complete business verification after logging in.
              </p>
            </div>

            <SupplierRegistrationForm />

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Verification Notice: all applications undergo a short audit of business identity and compliance details. Ensure your documents are clear and valid.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-sm font-bold text-white">
        ✦
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/70">{description}</p>
      </div>
    </div>
  );
}
