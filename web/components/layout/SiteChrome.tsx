"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/lib/types";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPortalRoute = pathname.startsWith("/admin") || pathname.startsWith("/supplier");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isPortalRoute) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchProducts({ limit: 50 });
        if (!cancelled) setProducts(result.data);
      } catch {
        // non-critical — cart drawer just won't show squad upsells
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPortalRoute]);

  if (isPortalRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CartDrawer products={products} />
    </>
  );
}
