"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { WhatsAppLoginModal } from "./WhatsAppLoginModal";

export function Navbar() {
  const { user, openLogin, logout } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-oceanic text-sm font-bold text-white">
              D
            </span>
            <span className="font-heading text-lg font-bold text-slate-900">
              DiscountBazaar<span className="text-oceanic">.PK</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="mx-auto hidden w-full max-w-md flex-1 md:flex">
            <div className="relative w-full">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search products or Tolis..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-oceanic focus:bg-white focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/products"
              className="hidden text-sm font-medium text-slate-600 hover:text-oceanic sm:inline"
            >
              Shop
            </Link>
            <Link href="/products" className="relative text-slate-600 hover:text-oceanic" aria-label="Cart">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
                <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-mint text-[10px] font-bold text-oceanic-dark">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden text-sm font-medium text-slate-600 hover:text-oceanic sm:inline"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="rounded-full border border-oceanic px-4 py-1.5 text-sm font-medium text-oceanic transition hover:bg-oceanic hover:text-white"
                >
                  {user.name.split(" ")[0]} · Log out
                </button>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="flex items-center gap-1.5 rounded-full border border-oceanic px-4 py-1.5 text-sm font-medium text-oceanic transition hover:bg-oceanic hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.3c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.4.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.7 1.8.7 2 .1.2.1.4 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.4.3-.2.7.2.4.9 1.5 1.9 2.4 1.2 1.1 2.2 1.5 2.7 1.7.4.2.6.1.8-.1.2-.3.7-.9.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.7.9.2.1.4.2.5.3.1.2.1.9-.1 1.4z" />
                </svg>
                Login via WhatsApp
              </button>
            )}
          </div>
        </div>
      </header>
      <WhatsAppLoginModal />
    </>
  );
}
