import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-oceanic/5 to-transparent">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-8 hidden h-72 w-72 rotate-12 rounded-3xl border-2 border-oceanic/10 lg:block"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
        <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-medium text-oceanic shadow-sm ring-1 ring-slate-200">
          Now live for buyers across Pakistan
        </span>

        <h1 className="mt-6 font-heading text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          Join a <span className="text-mint-dark">Toli</span>.<br />
          Unlock Wholesale Prices.
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
          Stop paying retail prices. Team up with your community to unlock collective discounts on your
          favorite brands.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="w-full rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-oceanic-dark sm:w-auto"
          >
            Start Browsing Deals
          </Link>
          <Link
            href="/squads"
            className="w-full rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-oceanic hover:text-oceanic sm:w-auto"
          >
            Learn How Toli Works
          </Link>
        </div>
      </div>
    </section>
  );
}
