"use client";

import Link from "next/link";
import { Users, UserPlus, Dumbbell, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-20 text-center backdrop-blur-xl">
      <div className="relative mb-6">
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full bg-[oklch(0.85_0.2_145/0.08)] blur-2xl" />
        {/* Icon composition */}
        <div className="relative flex items-center justify-center">
          <div className="flex size-20 items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
            <Users className="size-9 text-muted-foreground" />
          </div>
          <div className="absolute -right-3 -top-3 flex size-10 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl">
            <Dumbbell className="size-4 text-[oklch(0.85_0.2_145)]" />
          </div>
          <div className="absolute -bottom-3 -left-3 flex size-10 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl">
            <BarChart3 className="size-4 text-blue-400" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold tracking-tight">Build your roster</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Add clients to start creating personalized workout plans, tracking their
        progress, and building something legendary together.
      </p>

      <Button
        variant="gradient"
        size="lg"
        className="mt-6"
        nativeButton={false}
        render={<Link href="/coach/clients/new" />}
      >
        <UserPlus className="size-4" />
        Add Your First Client
      </Button>
    </div>
  );
}
