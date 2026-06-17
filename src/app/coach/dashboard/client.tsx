"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Users, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientTable } from "@/components/coach/client-table";
import { ClientTableSkeleton } from "@/components/coach/client-table-skeleton";
import Link from "next/link";

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

  const isLoading = !clerkLoaded || convexUser === undefined || clients === undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Coach Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {clerkUser?.firstName ?? "Coach"}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">My Clients</h2>
          <p className="text-muted-foreground mt-1">
            Manage your clients, assign plans, and track their progress.
          </p>
        </div>

        {isLoading ? (
          <ClientTableSkeleton />
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="bg-muted flex size-16 items-center justify-center rounded-full">
                <Users className="size-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">No clients yet</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Start by adding your first client to manage their workouts and progress.
                </p>
              </div>
              <Button render={<Link href="/coach/clients/new" />}>
                <UserPlus className="size-4" />
                Add Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <ClientTable clients={clients} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
