import { notFound } from "next/navigation";
import { fetchActiveSquadForProduct, fetchProductById } from "@/lib/api";
import { DualCheckout } from "@/components/product/DualCheckout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SoloCheckout } from "@/components/product/SoloCheckout";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await fetchProductById(id).catch(() => null);
  if (!product) notFound();

  const activeSquad = product.dualCheckoutEnabled ? await fetchActiveSquadForProduct(product._id) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Left column — gallery + description below it */}
        <div className="min-w-0">
          <ProductGallery images={product.images} alt={product.title} />
          <p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>
        </div>

        {/* Right column — title, pricing, checkout actions */}
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wide text-oceanic">{product.category}</span>
          <h1 className="mt-2 font-heading text-xl font-bold text-slate-900 sm:text-2xl">{product.title}</h1>

          {product.dualCheckoutEnabled ? (
            <DualCheckout product={product} activeSquad={activeSquad} />
          ) : (
            <SoloCheckout product={product} />
          )}
        </div>
      </div>
    </div>
  );
}
