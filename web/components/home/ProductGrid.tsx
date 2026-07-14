import Link from "next/link";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "./ProductCard";
import type { FetchProductsOptions } from "@/lib/api";

export async function ProductGrid({
  title,
  subtitle,
  viewAllHref,
  options,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  options?: FetchProductsOptions;
}) {
  const { data: products } = await fetchProducts(options);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-medium text-oceanic hover:underline">
            View All →
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No products here yet — the admin dashboard hasn&apos;t published any catalog items for this view.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
