"use client";

import Link from "next/link";
import { useIsMounted } from "@/lib/useIsMounted";

const marketplaceLinks = [
  { label: "Trending Tolis", href: "/squads" },
  { label: "Electronics", href: "/products?category=Electronics" },
  { label: "Home Essentials", href: "/products?category=Home+Decor" },
  { label: "Accessories", href: "/products?category=Accessories" },
];

const supportLinks = [
  { label: "Help Center", href: "#" },
  { label: "WhatsApp Support", href: "#" },
  { label: "Shipping Info", href: "#" },
  { label: "Refund Policy", href: "#" },
];

export function Footer() {
  const mounted = useIsMounted();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-oceanic text-xs font-bold text-white">
              D
            </span>
            <span className="font-heading text-base font-bold text-slate-900">DiscountBazaar.PK</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            Pakistan&apos;s first decentralized social commerce marketplace — team up in a Toli to unlock
            wholesale prices, or buy solo at standard retail.
          </p>
        </div>

        <FooterColumn title="Marketplace" links={marketplaceLinks} />
        <FooterColumn title="Support" links={supportLinks} />

        <div>
          <h3 className="font-heading text-sm font-semibold text-slate-900">Download</h3>
          <p className="mt-3 text-sm text-slate-500">The DiscountBazaar app is coming soon.</p>
          <div className="mt-3 flex flex-col gap-2">
            <div className="h-10 w-32 rounded-md bg-slate-100" />
            <div className="h-10 w-32 rounded-md bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {mounted ? new Date().getFullYear() : ""} DiscountBazaar.PK. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="font-heading text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-slate-500 hover:text-oceanic">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
