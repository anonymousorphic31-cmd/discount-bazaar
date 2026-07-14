"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { fetchMyOrders, fetchMySquads } from "@/lib/api";
import type { Order, Squad } from "@/lib/types";
import { SquadPledgeCard } from "@/components/dashboard/SquadPledgeCard";
import { OrderHistoryCard } from "@/components/dashboard/OrderHistoryCard";

type Tab = "pledges" | "orders";

function DashboardContent() {
  const { user, token, isHydrated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justJoined = searchParams.get("success") === "true";

  const [tab, setTab] = useState<Tab>("pledges");
  const [squads, setSquads] = useState<Squad[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/");
    }
  }, [isHydrated, user, router]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [squadData, orderData] = await Promise.all([fetchMySquads(token), fetchMyOrders(token)]);
      setSquads(squadData);
      setOrders(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  if (!isHydrated || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-slate-400">Loading your dashboard…</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-slate-900">My Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name}.</p>

      {justJoined && (
        <div className="mt-4 rounded-xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint-dark">
          Your 24-hour hold was authorized — you&apos;ve joined the Toli. It&apos;ll show up below.
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        <TabButton active={tab === "pledges"} onClick={() => setTab("pledges")}>
          Active Pledges (Tolis)
        </TabButton>
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
          Order History
        </TabButton>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : tab === "pledges" ? (
          squads.length === 0 ? (
            <EmptyState message="You haven't joined any Tolis yet. Find one on a product page to get started." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {squads.map((squad) => (
                <SquadPledgeCard
                  key={squad._id}
                  squad={squad}
                  onVoted={(updated) => setSquads((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))}
                />
              ))}
            </div>
          )
        ) : orders.length === 0 ? (
          <EmptyState message="No orders yet — your solo purchases and captured Tolis will show up here." />
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <OrderHistoryCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
        active ? "border-oceanic text-oceanic" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-slate-400">Loading…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
