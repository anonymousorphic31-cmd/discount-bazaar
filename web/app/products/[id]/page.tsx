import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchActiveSquadForProduct, fetchProductById } from "@/lib/api";
import { DualCheckout } from "@/components/product/DualCheckout";
import { AddToCartButton } from "@/components/home/AddToCartButton";
import { formatPKR } from "@/lib/format";
import type { Product } from "@/lib/types";

function SoloOnlyCheckout({ product }: { product: Product }) {
  return (
    <div className="mt-6">
      <p className="text-2xl font-bold text-oceanic">{formatPKR(product.pricing.currentRetailPrice)}</p>
      <div className="mt-4">
        <AddToCartButton productId={product._id} />
      </div>
    </div>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await fetchProductById(id).catch(() => null);
  if (!product) notFound();

  const activeSquad = product.dualCheckoutEnabled ? await fetchActiveSquadForProduct(product._id) : null;

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

          {product.dualCheckoutEnabled ? (
            <DualCheckout product={product} activeSquad={activeSquad} />
          ) : (
            <SoloOnlyCheckout product={product} />
          )}
        </div>
      </div>
    </div>
  );
}
