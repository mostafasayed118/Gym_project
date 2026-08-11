"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCards } from "@/components/coach/metric-cards";
import { ClientTable } from "@/components/coach/client-table";
import { ClientTableSkeleton } from "@/components/coach/client-table-skeleton";
import { EmptyState } from "@/components/coach/empty-state";
import { ChatPanel } from "@/components/messaging";

export function CoachDashboardClient() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkLoaded && clerkUser ? { clerkId: clerkUser.id } : "skip",
  );

  const clients = useQuery(
    api.users.getCoachClients,
    convexUser ? { coachId: convexUser._id } : "skip",
  );

  const metrics = useQuery(
    api.users.getCoachMetrics,
    convexUser ? { coachId: convexUser._id } : "skip",
  );

  const isLoading =
    !clerkLoaded ||
    convexUser === undefined ||
    clients === undefined ||
    metrics === undefined;

  return (
    <div className="flex min-h-screen flex-col bg-[#111508]">
      <header
        className="border-b border-[rgba(68,73,51,0.1)]"
        style={{ background: "rgba(17, 21, 8, 0.5)", backdropFilter: "blur(24px)" }}
      >
          <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#e2e4cf]">Dashboard</h1>
            <p className="mt-0.5 text-sm text-[#c4c9ac]">
              Welcome back, {clerkUser?.firstName ?? "Coach"}
            </p>
          </div>
          <ChatPanel />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        {isLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl"
                >
                  <CardContent className="flex items-center gap-4 py-5">
                    <div className="size-12 shrink-0 animate-pulse rounded-xl bg-[#282b1d]" />
                    <div className="space-y-2">
                      <div className="h-8 w-16 animate-pulse rounded bg-[#282b1d]" />
                      <div className="h-4 w-28 animate-pulse rounded bg-[#1e2113]" />
                    </div>
                  </CardContent>
                </div>
              ))}
            </div>
            <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl">
              <CardContent>
                <ClientTableSkeleton />
              </CardContent>
            </Card>
          </>
        ) : clients.length === 0 ? (
          <>
            <MetricCards
              totalActiveClients={metrics.totalActiveClients}
              sessionsThisWeek={metrics.sessionsThisWeek}
              clientsWithoutPlans={metrics.clientsWithoutPlans}
            />
            <EmptyState />
          </>
        ) : (
          <>
            <MetricCards
              totalActiveClients={metrics.totalActiveClients}
              sessionsThisWeek={metrics.sessionsThisWeek}
              clientsWithoutPlans={metrics.clientsWithoutPlans}
            />
            <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl">
              <CardContent>
                <ClientTable clients={clients} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
