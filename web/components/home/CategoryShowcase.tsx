import Link from "next/link";
import { fetchCategories } from "@/lib/api";
import { getCategoryIcon } from "@/lib/categoryIcons";

export async function CategoryShowcase() {
  const categories = await fetchCategories();
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <div className="text-center">
          <h2 className="font-heading text-xl font-bold text-slate-900">Shop by Category</h2>
          <p className="mt-1 text-sm text-slate-500">Find exactly what you need from our curated collections</p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-6 sm:grid-cols-6">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.name);
            return (
              <Link
                key={category.name}
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center gap-2 text-center"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-oceanic/5 text-oceanic transition group-hover:bg-oceanic group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-slate-600 group-hover:text-oceanic">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
