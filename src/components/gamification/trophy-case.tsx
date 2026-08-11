"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Trophy, Flame, Dumbbell, Zap, Award, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

interface TrophyCaseProps {
  userId: Id<"users">
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  first_session: <Dumbbell className="size-5" />,
  "7_day_streak": <Flame className="size-5" />,
  "14_day_streak": <Flame className="size-5" />,
  "30_day_streak": <Flame className="size-5" />,
  "100k_club": <Trophy className="size-5" />,
  "500k_club": <Trophy className="size-5" />,
  "1m_club": <Trophy className="size-5" />,
  first_pr: <Zap className="size-5" />,
  pr_machine: <Zap className="size-5" />,
  pr_legend: <Zap className="size-5" />,
}

const BADGE_COLORS: Record<string, string> = {
  first_session: "text-[#c4c9ac]",
  "7_day_streak": "text-[#ffb300]",
  "14_day_streak": "text-[#ffb300]",
  "30_day_streak": "text-[#ffb300]",
  "100k_club": "text-[#abd600]",
  "500k_club": "text-[#abd600]",
  "1m_club": "text-[#c3f400]",
  first_pr: "text-[#abd600]",
  pr_machine: "text-[#abd600]",
  pr_legend: "text-[#c3f400]",
}

const BADGE_DESCRIPTIONS: Record<string, string> = {
  first_session: "Complete your first workout",
  "7_day_streak": "Work out 7 days in a row",
  "14_day_streak": "Work out 14 days in a row",
  "30_day_streak": "Work out 30 days in a row",
  "100k_club": "Lift 100,000 kg total",
  "500k_club": "Lift 500,000 kg total",
  "1m_club": "Lift 1,000,000 kg total",
  first_pr: "Hit your first personal record",
  pr_machine: "Hit 10 personal records",
  pr_legend: "Hit 50 personal records",
}

export function TrophyCase({ userId }: TrophyCaseProps) {
  const stats = useQuery(api.gamification.getUserStats, { userId })
  const badgeDefs = useQuery(api.gamification.getBadgeDefinitions)

  if (stats === undefined || badgeDefs === undefined) {
    return <TrophyCaseSkeleton />
  }

  const unlockedIds = new Set(stats.badges.map((b) => b.id))

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card className="bg-[rgba(9,9,11,0.5)] backdrop-blur-2xl border border-[rgba(68,73,51,0.2)] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-[#abd600]" />
              Your Stats
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {stats.totalSessions} sessions
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Flame className="size-5 text-[#ffb300]" />}
              value={stats.currentStreak}
              label="Current Streak"
              className="border-[#ffb300]/20 bg-[#ffb300]/5"
            />
            <StatCard
              icon={<Trophy className="size-5 text-[#abd600]" />}
              value={stats.maxStreak}
              label="Best Streak"
              className="border-[#abd600]/20 bg-[#abd600]/5"
            />
            <StatCard
              icon={<Dumbbell className="size-5 text-[#c4c9ac]" />}
              value={formatVolume(stats.totalVolume)}
              label="Total Volume"
            />
            <StatCard
              icon={<Star className="size-5 text-[#ffb300]" />}
              value={stats.badges.length}
              label="Badges"
              className="border-[#ffb300]/20 bg-[#ffb300]/5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trophy Case */}
      <Card className="bg-[rgba(9,9,11,0.5)] backdrop-blur-2xl border border-[rgba(68,73,51,0.2)] rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="size-5 text-[#abd600]" />
              Trophy Case
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {stats.badges.length}/{badgeDefs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {badgeDefs.map((badge) => {
              const unlocked = unlockedIds.has(badge.id)
              const unlockedDate = stats.badges.find((b) => b.id === badge.id)?.unlockedAt

              return (
                <div
                  key={badge.id}
                  className={cn(
                    "group relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all duration-300",
                    unlocked
                      ? "border-[#abd600]/30 bg-gradient-to-b from-[#abd600]/5 to-transparent hover:border-[#abd600]/50 hover:shadow-lg hover:shadow-[#abd600]/10"
                      : "border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.2)] opacity-40 grayscale hover:opacity-60"
                  )}
                >
                  {unlocked && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#abd600]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}

                  <div
                    className={cn(
                      "relative flex size-14 items-center justify-center rounded-2xl transition-all",
                      unlocked
                        ? "bg-[#abd600]/15 glow-neon-sm"
                        : "bg-[#333627]/50",
                      BADGE_COLORS[badge.id] ?? "text-[#c4c9ac]"
                    )}
                  >
                    {BADGE_ICONS[badge.id] ?? <Award className="size-6" />}
                  </div>

                  <div className="relative">
                    <p className="text-xs font-semibold leading-tight text-[#e2e4cf]">
                      {badge.name}
                    </p>
                    <p className="mt-1 text-[10px] text-[#c4c9ac]/60 leading-tight">
                      {BADGE_DESCRIPTIONS[badge.id] ?? badge.description}
                    </p>
                    {unlocked && unlockedDate && (
                      <p className="mt-1 text-[10px] text-[#abd600]/70">
                        Unlocked {new Date(unlockedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  className,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.2)] p-4 text-center",
        className
      )}
    >
      <div className="flex items-center justify-center">{icon}</div>
      <div>
        <p className="font-metric-lg text-2xl font-bold text-[#e2e4cf]">{value}</p>
        <p className="text-xs text-[#c4c9ac]">{label}</p>
      </div>
    </div>
  )
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}k`
  return volume.toString()
}

function TrophyCaseSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="bg-[rgba(9,9,11,0.5)] backdrop-blur-2xl border border-[rgba(68,73,51,0.2)] rounded-xl">
        <CardHeader>
          <div className="h-5 w-24 animate-pulse rounded bg-[#282b1d]" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#282b1d]/30" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[rgba(9,9,11,0.5)] backdrop-blur-2xl border border-[rgba(68,73,51,0.2)] rounded-xl">
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-[#282b1d]" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-[#282b1d]/30" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
