import Link from "next/link";
import Image from "next/image";
import type { Squad } from "@/lib/types";
import { formatPKR, hoursUntil, squadCurrentPrice } from "@/lib/format";

export function SquadCard({ squad }: { squad: Squad }) {
  const { productId: product, currentMembers, targetMembers, expiresAt } = squad;
  const anchorPrice = product.pricing.marketAnchorPrice;
  const currentPrice = squadCurrentPrice(
    anchorPrice,
    product.pricing.maxSquadDiscount,
    currentMembers,
    targetMembers,
  );
  const progress = Math.min(100, Math.round((currentMembers / targetMembers) * 100));
  const hoursLeft = hoursUntil(expiresAt);

  return (
    <div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm snap-start">
      <div className="relative h-40 w-full bg-slate-100">
        {product.images[0] ? (
          <Image src={product.images[0]} alt={product.title} fill className="object-cover" sizes="256px" />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-400">No image</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-oceanic shadow-sm">
          {hoursLeft}h left
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-800">{product.title}</h3>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-oceanic">{formatPKR(currentPrice)}</span>
          <span className="text-xs text-slate-400 line-through">{formatPKR(anchorPrice)}</span>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-mint" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {currentMembers}/{targetMembers} Joined
          </p>
        </div>

        <Link
          href={`/products/${product._id}`}
          className="mt-1 rounded-full bg-oceanic px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-oceanic-dark"
        >
          Join this Toli
        </Link>
      </div>
    </div>
  );
}
