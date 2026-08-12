"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import {
  Users,
  Activity,
  FileText,
  Zap,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Clock,
  UserPlus,
  Shield,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Stagger } from "@/components/animations/stagger"
import { ExerciseCatalogCard } from "@/components/admin/exercise-catalog-card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ─── Mock error rate data (replace with real Sentry API when ready) ───

function generateErrorRateData() {
  const data = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: hour.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }),
      errors: Math.floor(Math.random() * 5) + (i < 6 ? 2 : 0),
      requests: Math.floor(Math.random() * 100) + 200,
    })
  }
  return data
}

// ─── Main Mission Control Component ────────────────────────────────

export function MissionControl() {
  return (
    <div className="space-y-6">
      <HealthGrid />
      <ExerciseCatalogCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <ErrorRateWidget />
        <ActivityFeed />
      </div>
      <QuickActions />
    </div>
  )
}

// ─── Health Grid ───────────────────────────────────────────────────

function HealthGrid() {
  const health = useQuery(api.auth.getSystemHealth)

  if (!health) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10">
            <CardContent className="py-4">
              <Skeleton className="mb-2 h-4 w-24 rounded bg-[#282b1d]" />
              <Skeleton className="h-7 w-16 rounded bg-[#282b1d]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        icon={<Users className="size-5" />}
        label="Total Users"
        value={health.totalUsers.toString()}
        subtitle={`${health.usersByRole.admin} admin · ${health.usersByRole.coach} coach · ${health.usersByRole.user} client`}
        iconBg="bg-amber-500/10"
        iconColor="text-amber-400"
      />

      <MetricCard
        icon={<Activity className="size-5" />}
        label="Active Sessions"
        value={health.activeSessions.toString()}
        subtitle={`${health.sessionsToday} today`}
        iconBg="bg-[oklch(0.85_0.2_145/0.1)]"
        iconColor="text-[oklch(0.85_0.2_145)]"
        trend={health.activeSessions > 0 ? "up" : "down"}
      />

      <MetricCard
        icon={<FileText className="size-5" />}
        label="Active Plans"
        value={health.activePlans.toString()}
        subtitle={`${health.totalPlans} total`}
        iconBg="bg-blue-500/10"
        iconColor="text-blue-400"
      />

      <MetricCard
        icon={<Zap className="size-5" />}
        label="Volume (24h)"
        value={`${(health.volumeLast24h / 1000).toFixed(1)}k`}
        subtitle="kg lifted"
        iconBg="bg-purple-500/10"
        iconColor="text-purple-400"
      />
    </Stagger>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  iconBg,
  iconColor,
  trend,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle: string
  iconBg: string
  iconColor: string
  trend?: "up" | "down"
}) {
  return (
    <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10">
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-metric-lg text-2xl font-bold tabular-nums text-[#e2e4cf]">{value}</p>
            {trend && (
              <TrendingUp
                className={`size-3 ${trend === "up" ? "text-[#abd600]" : "text-[#ff6b6b] rotate-180"}`}
              />
            )}
          </div>
          <p className="font-label-caps text-[10px] text-[#c4c9ac] uppercase">{label}</p>
          <p className="mt-0.5 truncate text-[10px] text-[#c4c9ac]/60">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Error Rate Widget ─────────────────────────────────────────────

function ErrorRateWidget() {
  const errorData = generateErrorRateData()
  const totalErrors = errorData.reduce((sum, d) => sum + d.errors, 0)
  const totalRequests = errorData.reduce((sum, d) => sum + d.requests, 0)
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : "0.00"

  return (
    <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
            <AlertTriangle className="size-4 text-[#ffb300]" />
            Error Rate (24h)
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-xs ${
              parseFloat(errorRate) > 1
                ? "border-[#ff6b6b]/20 bg-[#ff6b6b]/10 text-[#ff6b6b]"
                : "border-[#abd600]/20 bg-[#abd600]/10 text-[#abd600]"
            }`}
          >
            {errorRate}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={errorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444933" />
              <XAxis
                dataKey="time"
                stroke="#c4c9ac"
                fontSize={10}
                tickLine={false}
                interval={3}
              />
              <YAxis stroke="#c4c9ac" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e2113",
                  border: "1px solid rgba(68, 73, 51, 0.2)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#c4c9ac" }}
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="#abd600"
                strokeWidth={2}
                dot={false}
                name="Errors"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground/60">
          <span>{totalErrors} errors in 24h</span>
          <span>{totalRequests.toLocaleString()} total requests</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Live Activity Feed ────────────────────────────────────────────

function ActivityFeed() {
  const logs = useQuery(api.audit.getRecentAuditLogs, { limit: 15 })

  return (
    <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
            <Clock className="size-4 text-[#abd600]" />
            Live Activity
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-[#abd600]" />
            <span className="text-[10px] text-[#c4c9ac]/60">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!logs ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full bg-[#282b1d]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40 rounded bg-[#282b1d]" />
                  <Skeleton className="h-2.5 w-24 rounded bg-[#1e2113]" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="mb-2 size-6 text-[#c4c9ac]/30" />
            <p className="text-xs text-[#c4c9ac]/60">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <ActivityItem key={log._id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityItem({
  log,
}: {
  log: {
    _id: string
    action: string
    targetEntity: string
    targetId: string
    timestamp: number
    actorName: string
    metadata?: Record<string, unknown>
  }
}) {
  const icon = getActionIcon(log.action)
  const description = getActionDescription(log)
  const timeAgo = formatTimeAgo(log.timestamp)

  return (
    <div className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#1e2113]/20">
      <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${getActionBg(log.action)}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed">
          <span className="font-medium text-[#e2e4cf]">{log.actorName}</span>{" "}
          <span className="text-[#c4c9ac]">{description}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-[#c4c9ac]/50">{timeAgo}</p>
      </div>
    </div>
  )
}

function getActionIcon(action: string) {
  switch (action) {
    case "deleteUser":
      return <Users className="size-3.5 text-red-400" />
    case "updateRole":
      return <Shield className="size-3.5 text-amber-400" />
    case "assignCoach":
      return <UserPlus className="size-3.5 text-blue-400" />
    case "syncUser":
      return <UserPlus className="size-3.5 text-[oklch(0.85_0.2_145)]" />
    default:
      return <Activity className="size-3.5 text-muted-foreground" />
  }
}

function getActionBg(action: string) {
  switch (action) {
    case "deleteUser":
      return "bg-[#ff6b6b]/10"
    case "updateRole":
      return "bg-[#ffb300]/10"
    case "assignCoach":
      return "bg-blue-500/10"
    case "syncUser":
      return "bg-[#abd600]/10"
    default:
      return "bg-[#333627]/50"
  }
}

function getActionDescription(log: { action: string; targetEntity: string; metadata?: Record<string, unknown> }) {
  switch (log.action) {
    case "deleteUser":
      return "removed a user"
    case "updateRole":
      return `changed role to ${log.metadata?.newRole ?? "unknown"}`
    case "assignCoach":
      return "assigned a coach"
    case "syncUser":
      return "synced account"
    default:
      return `performed ${log.action}`
  }
}

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Quick Actions ─────────────────────────────────────────────────

function QuickActions() {
  return (
    <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10">
      <CardHeader className="pb-2">
        <CardTitle className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#444933]/30 bg-[#1e2113]/50 text-xs text-[#c4c9ac]"
            onClick={() => window.open("https://sentry.io", "_blank")}
          >
            <ExternalLink className="size-3.5" />
            View Sentry Issues
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#444933]/30 bg-[#1e2113]/50 text-xs text-[#c4c9ac]"
            onClick={() => window.open("https://posthog.com", "_blank")}
          >
            <TrendingUp className="size-3.5" />
            PostHog Analytics
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#444933]/30 bg-[#1e2113]/50 text-xs text-[#c4c9ac]"
            onClick={() => window.open("https://dashboard.convex.dev", "_blank")}
          >
            <RefreshCw className="size-3.5" />
            Convex Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#444933]/30 bg-[#1e2113]/50 text-xs text-[#c4c9ac]"
            onClick={() => window.open("https://vercel.com", "_blank")}
          >
            <ExternalLink className="size-3.5" />
            Vercel Deployments
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
