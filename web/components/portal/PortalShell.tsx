"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import type { ReactNode } from "react";

export interface PortalTab {
  id: string;
  label: string;
  icon?: string;
}

interface PortalShellProps {
  title: string;
  subtitle: string;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export function PortalShell({ title, subtitle, tabs, activeTab, onTabChange, children }: PortalShellProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleTabChange(id: string) {
    onTabChange(id);
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-oceanic text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/DB_logo.png"
              alt="DiscountBazaar"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-contain"
            />
            <span className="font-heading text-sm font-bold tracking-tight">
              DiscountBazaar<span className="text-mint">.PK</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="px-5 py-2 text-[10px] uppercase tracking-[0.18em] text-white/40">{title}</p>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.icon && <span className="text-base leading-none">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold uppercase">
              {user?.name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-white/50">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 w-full rounded-lg border border-white/20 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h2 className="font-heading text-base font-bold text-slate-900 sm:text-lg">
              {tabs.find((t) => t.id === activeTab)?.label ?? title}
            </h2>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="hidden text-xs font-medium text-slate-500 transition hover:text-oceanic sm:inline"
              >
                View Storefront
              </Link>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-oceanic/10 text-xs font-bold text-oceanic">
                  {user?.name?.charAt(0) ?? "?"}
                </div>
                <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
