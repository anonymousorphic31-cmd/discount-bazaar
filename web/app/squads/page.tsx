import { fetchActiveSquads } from "@/lib/api";
import { SquadCard } from "@/components/home/SquadCard";

export default async function SquadsPage() {
  const squads = await fetchActiveSquads(50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900">Trending Tolis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every Toli below is currently gathering members. Join before the 24-hour window closes to lock in
        the group price.
      </p>

      {squads.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No Tolis are forming right now — check back soon.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <SquadCard key={squad._id} squad={squad} />
          ))}
        </div>
      )}
    </div>
  );
}
