"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { WhatsAppLoginModal } from "./WhatsAppLoginModal";

const navLinks = [
  { label: "Products", href: "/products" },
  { label: "Offers", href: "/squads" },
  { label: "Become a Supplier", href: "/supplier/register", highlight: true },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { count, toggleDrawer } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
    setSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          {/* Logo — left, with platform icon */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/images/DB_logo.png"
              alt="DiscountBazaar"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
              priority
            />
            <span className="font-heading text-base font-bold text-slate-900 sm:text-lg">
              DiscountBazaar<span className="text-oceanic">.PK</span>
            </span>
          </Link>

          {/* Nav links — shifted right of center, desktop only */}
          <nav className="ml-auto mr-auto hidden items-center gap-1 pl-12 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={
                  link.highlight
                    ? "rounded-full bg-mint px-5 py-2 text-sm font-bold text-oceanic-dark transition hover:bg-mint-dark hover:text-white"
                    : "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-oceanic"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="ml-auto grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              {mobileMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Right cluster — search icon + cart + auth */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
            {/* Search icon button */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-oceanic"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>

            {/* Cart */}
            <button
              onClick={toggleDrawer}
              className="relative grid h-9 w-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-oceanic"
              aria-label="Open cart"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-mint text-[10px] font-bold text-oceanic-dark">
                  {count}
                </span>
              )}
            </button>

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={user.role === "Admin" ? "/admin" : user.role === "Supplier" ? "/supplier" : "/dashboard"}
                  className="hidden text-sm font-medium text-slate-600 hover:text-oceanic lg:inline"
                >
                  {user.role === "Admin" ? "Console" : user.role === "Supplier" ? "Portal" : "Dashboard"}
                </Link>
                <button
                  onClick={logout}
                  className="rounded-full border border-oceanic px-3 py-1.5 text-xs font-medium text-oceanic transition hover:bg-oceanic hover:text-white sm:px-4 sm:text-sm"
                >
                  {user.name.split(" ")[0]} · Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={
                    link.highlight
                      ? "rounded-full bg-mint px-5 py-2.5 text-center text-sm font-bold text-oceanic-dark"
                      : "rounded-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <form onSubmit={handleSearch} className="mt-4">
              <div className="relative">
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
                  placeholder="Search products or Squads..."
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 focus:border-oceanic focus:bg-white focus:outline-none"
                />
              </div>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={toggleDrawer}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                  <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
                  <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
                Cart {count > 0 && `(${count})`}
              </button>
              {user && (
                <Link
                  href={user.role === "Admin" ? "/admin" : user.role === "Supplier" ? "/supplier" : "/dashboard"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full border border-oceanic px-4 py-2 text-sm font-medium text-oceanic"
                >
                  {user.role === "Admin" ? "Console" : user.role === "Supplier" ? "Portal" : "Dashboard"}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Expandable search bar (desktop) */}
        {searchOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="relative">
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
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                  placeholder="Search products or Squads..."
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 focus:border-oceanic focus:bg-white focus:outline-none"
                />
              </div>
            </form>
          </div>
        )}
      </header>
      <WhatsAppLoginModal />
    </>
  );
}
