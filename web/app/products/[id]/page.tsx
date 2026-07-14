import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchProductById } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import { AddToCartButton } from "@/components/home/AddToCartButton";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await fetchProductById(id).catch(() => null);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
          {product.images[0] ? (
            <Image src={product.images[0]} alt={product.title} fill className="object-cover" sizes="50vw" />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-400">No image</div>
          )}
        </div>

        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-oceanic">{product.category}</span>
          <h1 className="mt-2 font-heading text-2xl font-bold text-slate-900">{product.title}</h1>
          <p className="mt-3 text-sm text-slate-500">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-oceanic">
              {formatPKR(product.pricing.currentRetailPrice)}
            </span>
            {product.dualCheckoutEnabled && (
              <span className="text-sm text-slate-400 line-through">
                {formatPKR(product.pricing.marketAnchorPrice)}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <AddToCartButton productId={product._id} />
            {product.dualCheckoutEnabled && (
              <button
                disabled
                title="Squad checkout is part of the escrow flow, coming in the next phase"
                className="w-full rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-400 sm:w-auto"
              >
                Join a Toli (coming soon)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
