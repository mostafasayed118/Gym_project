"use client";

import { Users, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardsProps {
  totalActiveClients: number;
  sessionsThisWeek: number;
  clientsWithoutPlans: number;
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  accent: "neon" | "blue" | "amber";
}

const accentMap = {
  neon: {
    bg: "bg-[#abd600]/10",
    icon: "text-[#abd600]",
  },
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-400",
  },
  amber: {
    bg: "bg-[#ffb300]/10",
    icon: "text-[#ffb300]",
  },
};

function MetricCard({ label, value, icon, trend, accent }: MetricCardProps) {
  const colors = accentMap[accent];

  return (
    <Card className="group/card bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl transition-all duration-300 hover:border-[rgba(171,214,0,0.3)] hover:bg-[rgba(9,9,11,0.7)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover/card:scale-110",
            colors.bg,
          )}
        >
          <div className={cn("size-5", colors.icon)}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-metric-lg text-3xl font-bold tracking-tight tabular-nums text-[#e2e4cf]">
            {value}
          </p>
          <p className="mt-0.5 text-sm text-[#c4c9ac]">{label}</p>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.value >= 0
                ? "bg-[#abd600]/10 text-[#abd600]"
                : "bg-[#ff6b6b]/10 text-[#ff6b6b]",
            )}
          >
            <TrendingUp
              className={cn(
                "size-3",
                trend.value < 0 && "rotate-180",
              )}
            />
            <span>{Math.abs(trend.value)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricCards({
  totalActiveClients,
  sessionsThisWeek,
  clientsWithoutPlans,
}: MetricCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        label="Active Clients"
        value={totalActiveClients}
        icon={<Users className="size-5" />}
        accent="neon"
      />
      <MetricCard
        label="Sessions This Week"
        value={sessionsThisWeek}
        icon={<Calendar className="size-5" />}
        accent="blue"
      />
      <MetricCard
        label="Clients Without Plans"
        value={clientsWithoutPlans}
        icon={<AlertTriangle className="size-5" />}
        accent="amber"
      />
    </div>
  );
}
