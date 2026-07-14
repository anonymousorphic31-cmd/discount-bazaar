import Link from "next/link";
import { fetchActiveSquads } from "@/lib/api";
import { SquadCard } from "./SquadCard";

export async function TrendingSquads() {
  const squads = await fetchActiveSquads(10);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900">Trending Tolis</h2>
          <p className="mt-1 text-sm text-slate-500">Groups currently forming — join before they&apos;re full</p>
        </div>
        <Link href="/squads" className="text-sm font-medium text-oceanic hover:underline">
          View All Groups →
        </Link>
      </div>

      {squads.length === 0 ? (
        <EmptySquadsState />
      ) : (
        <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2 snap-x">
          {squads.map((squad) => (
            <SquadCard key={squad._id} squad={squad} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptySquadsState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
      No Tolis are forming right now — check back soon, or be the first to start one from any product page.
    </div>
  );
}
