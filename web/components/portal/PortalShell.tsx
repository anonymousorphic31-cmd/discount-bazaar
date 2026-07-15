"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import type { ReactNode } from "react";

export interface PortalTab {
  id: string;
  label: string;
}

interface PortalShellProps {
  title: string;
  subtitle: string;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

/**
 * Shared Oceanic-Blue sidebar shell for the Supplier and Admin portals — a
 * dense, left-nav SaaS layout distinct from the buyer-facing storefront.
 */
export function PortalShell({ title, subtitle, tabs, activeTab, onTabChange, children }: PortalShellProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 shrink-0 flex-col bg-oceanic text-white">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/" className="font-heading text-lg font-bold">
            DiscountBazaar<span className="text-mint">.PK</span>
          </Link>
          <p className="mt-1 text-xs uppercase tracking-wide text-white/60">{title}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                activeTab === tab.id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-white/60">{subtitle}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-white/20 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
