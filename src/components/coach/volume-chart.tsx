"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface VolumeData {
  date: string;
  volume: number;
  label: string;
}

interface VolumeChartProps {
  data: VolumeData[];
  className?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
        {payload[0]?.value.toLocaleString()} kg
      </p>
    </div>
  );
}

export function VolumeChart({ data, className }: VolumeChartProps) {
  return (
    <div className={cn("h-[240px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.85 0.2 145)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="oklch(0.85 0.2 145)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.25 0.005 270)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="oklch(0.85 0.2 145)"
            strokeWidth={2}
            fill="url(#volumeGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "oklch(0.85 0.2 145)",
              stroke: "oklch(0.13 0 0)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-[240px] w-full animate-pulse rounded-xl bg-zinc-900/30",
        className,
      )}
    >
      <div className="flex h-full items-end gap-1 p-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-zinc-800/40"
            // Deterministic pseudo-random heights so the skeleton is stable
            // across renders (Math.random during render breaks purity).
            style={{ height: `${20 + ((i * 37) % 61)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
