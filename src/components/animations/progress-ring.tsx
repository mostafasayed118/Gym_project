"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  color?: "neon" | "blue" | "amber" | "success" | "danger";
}

const colorMap = {
  neon: {
    stroke: "oklch(0.85 0.2 145)",
    track: "oklch(0.18 0.005 270)",
    text: "oklch(0.85 0.2 145)",
  },
  blue: {
    stroke: "#60a5fa",
    track: "oklch(0.18 0.005 270)",
    text: "#60a5fa",
  },
  amber: {
    stroke: "#fbbf24",
    track: "oklch(0.18 0.005 270)",
    text: "#fbbf24",
  },
  success: {
    stroke: "oklch(0.65 0.2 155)",
    track: "oklch(0.18 0.005 270)",
    text: "oklch(0.65 0.2 155)",
  },
  danger: {
    stroke: "oklch(0.6 0.22 25)",
    track: "oklch(0.18 0.005 270)",
    text: "oklch(0.6 0.22 25)",
  },
};

export function ProgressRing({
  value,
  max,
  size = 64,
  strokeWidth = 5,
  className,
  showLabel = true,
  label,
  color = "neon",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - percentage);
  const colors = colorMap[color];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle"
          style={
            {
              "--progress-circumference": circumference,
              "--progress-offset": offset,
            } as React.CSSProperties
          }
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <div className="progress-ring-text absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold tabular-nums leading-none"
            style={{
              fontSize: size * 0.22,
              color: colors.text,
            }}
          >
            {Math.round(percentage * 100)}
          </span>
          {label && (
            <span
              className="text-muted-foreground leading-none"
              style={{ fontSize: size * 0.13 }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
