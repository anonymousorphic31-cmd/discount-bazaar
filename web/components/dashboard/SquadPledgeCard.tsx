"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { voteOnSquad } from "@/lib/api";
import { formatPKR, squadCurrentPrice } from "@/lib/format";
import type { Squad } from "@/lib/types";

export function SquadPledgeCard({ squad, onVoted }: { squad: Squad; onVoted: (squad: Squad) => void }) {
  const { user, token } = useAuth();
  const [isVoting, setVoting] = useState<"Proceed" | "OptOut" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { productId: product, currentMembers, targetMembers } = squad;
  const progress = Math.min(100, Math.round((currentMembers / targetMembers) * 100));
  const price = squadCurrentPrice(product.pricing.marketAnchorPrice, product.pricing.maxSquadDiscount, currentMembers, targetMembers);

  const myMembership = squad.members.find((m) => m.userId === user?.id);
  const hasVoted = Boolean(myMembership?.vote);

  async function castVote(vote: "Proceed" | "OptOut") {
    if (!token) return;
    setError(null);
    setVoting(vote);
    try {
      await voteOnSquad(squad._id, vote, token);
      onVoted({
        ...squad,
        members: squad.members.map((m) => (m.userId === user?.id ? { ...m, vote } : m)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record your vote.");
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {product.images[0] && (
            <Image src={product.images[0]} alt={product.title} fill className="object-cover" sizes="80px" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">{product.title}</p>
          <p className="mt-1 text-sm font-bold text-oceanic">{formatPKR(price)}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-mint" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {currentMembers}/{targetMembers} joined · Status: {squad.status}
          </p>
        </div>
      </div>

      {squad.status === "Voting" && (
        <div className="border-t border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠ This Toli reached its 24-hour deadline — decide now
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Proceed to capture your deposit and dispatch the order, or opt out to release your funds instantly.
          </p>

          {hasVoted ? (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-600">
              You voted: <span className="font-bold">{myMembership?.vote}</span>
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => castVote("Proceed")}
                disabled={isVoting !== null}
                className="w-full rounded-full bg-oceanic px-6 py-3 text-sm font-bold text-white transition hover:bg-oceanic-dark disabled:opacity-60"
              >
                {isVoting === "Proceed" ? "Processing…" : "PROCEED (Capture Deposit & Dispatch)"}
              </button>
              <button
                onClick={() => castVote("OptOut")}
                disabled={isVoting !== null}
                className="w-full rounded-full border-2 border-red-500 bg-white px-6 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                {isVoting === "OptOut" ? "Processing…" : "OPT-OUT (Instantly Release My Funds)"}
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
