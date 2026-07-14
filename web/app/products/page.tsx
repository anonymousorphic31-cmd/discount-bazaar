import Link from "next/link";
import { fetchCategories, fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/home/ProductCard";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [{ data: products, pagination }, categories] = await Promise.all([
    fetchProducts({ category: params.category, page: params.page ? Number(params.page) : 1, limit: 24 }),
    fetchCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900">
        {params.category ? `${params.category}` : "Shop All"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{pagination.total} products</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <CategoryPill label="All" href="/products" active={!params.category} />
        {categories.map((c) => (
          <CategoryPill
            key={c.name}
            label={c.name}
            href={`/products?category=${encodeURIComponent(c.name)}`}
            active={params.category === c.name}
          />
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No products found. The admin dashboard hasn&apos;t published anything in this category yet.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPill({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-oceanic text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-oceanic"
      }`}
    >
      {label}
    </Link>
  );
}
