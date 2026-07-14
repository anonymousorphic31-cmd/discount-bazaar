const badges = [
  {
    title: "Safepay Verified",
    subtitle: "Bank-grade escrow on every deposit",
  },
  {
    title: "No Questions Refund",
    subtitle: "Opt out of any Toli before it locks",
  },
  {
    title: "Nationwide Delivery",
    subtitle: "Shipping to every major city in Pakistan",
  },
];

export function TrustBadges() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-3">
        {badges.map((badge) => (
          <div key={badge.title} className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint-dark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{badge.title}</p>
              <p className="text-xs text-slate-500">{badge.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
