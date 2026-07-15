import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-oceanic">
      {/* Decorative glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-mint/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-mint/5 blur-3xl"
      />
      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          Buy Together, <span className="text-mint">Save Together</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Stop paying retail prices. Team up with your community in a Squad to unlock collective
          discounts on your favorite brands.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="w-full rounded-full bg-mint px-7 py-3.5 text-sm font-bold text-oceanic-dark shadow-lg shadow-mint/20 transition hover:bg-mint-dark hover:text-white sm:w-auto"
          >
            Explore Products
          </Link>
          <Link
            href="/squads"
            className="w-full rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto"
          >
            Get Discount Now
          </Link>
        </div>
      </div>
    </section>
  );
}
