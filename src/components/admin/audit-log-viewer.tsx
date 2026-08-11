"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Shield, Filter, Download, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type AuditLogRow = {
  _id: string
  timestamp: number
  actorName: string
  actorEmail: string
  action: string
  targetEntity: string
  targetId: string
}

function startOfLocalDay(yyyyMmDd: string): number | null {
  if (!yyyyMmDd) return null
  const ts = new Date(`${yyyyMmDd}T00:00:00`).getTime()
  return Number.isNaN(ts) ? null : ts
}

function endOfLocalDay(yyyyMmDd: string): number | null {
  if (!yyyyMmDd) return null
  const ts = new Date(`${yyyyMmDd}T23:59:59.999`).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")

  const logs = useQuery(api.audit.getRecentAuditLogs, {
    limit: 50,
  })

  const stats = useQuery(api.audit.getAuditLogStats, {})

  const filteredLogs = React.useMemo<AuditLogRow[] | undefined>(() => {
    if (!logs) return undefined

    const needle = actionFilter.trim().toLowerCase()
    const startTs = startOfLocalDay(startDate)
    const endTs = endOfLocalDay(endDate)

    return logs.filter((log) => {
      if (needle && !log.action.toLowerCase().includes(needle)) return false
      if (startTs !== null && log.timestamp < startTs) return false
      if (endTs !== null && log.timestamp > endTs) return false
      return true
    })
  }, [logs, actionFilter, startDate, endDate])

  const hasActiveFilters =
    actionFilter.trim().length > 0 || startDate.length > 0 || endDate.length > 0

  const clearFilters = React.useCallback(() => {
    setActionFilter("")
    setStartDate("")
    setEndDate("")
  }, [])

  const exportToCSV = React.useCallback(() => {
    const rowsSource = filteredLogs ?? []
    if (rowsSource.length === 0) return

    const headers = ["Timestamp", "Actor", "Email", "Action", "Target", "Target ID"]
    const escapeCell = (value: string) => {
      const needsQuote = /[",\n\r]/.test(value)
      const escaped = value.replace(/"/g, '""')
      return needsQuote ? `"${escaped}"` : escaped
    }

    const rows = rowsSource.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.actorName,
      log.actorEmail,
      log.action,
      log.targetEntity,
      log.targetId,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredLogs])

  const getActionColor = (
    action: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("delete")) return "destructive"
    if (action.includes("update") || action.includes("assign")) {
      return "secondary"
    }
    return "default"
  }

  const totalLoaded = logs?.length ?? 0
  const totalShown = filteredLogs?.length ?? 0
  const exportDisabled = totalShown === 0

  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            Audit Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={exportDisabled}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalLogs}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Object.keys(stats.actionCounts).length}</p>
              <p className="text-xs text-muted-foreground">Action Types</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Object.keys(stats.actorCounts).length}</p>
              <p className="text-xs text-muted-foreground">Unique Actors</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Input
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-36"
            aria-label="Start date"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-36"
            aria-label="End date"
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs text-muted-foreground"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
          {logs !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              Showing {totalShown} of {totalLoaded}
            </span>
          )}
        </div>

        {/* Log entries */}
        <div className="space-y-2">
          {filteredLogs === undefined ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-800/40 p-3">
                <div className="size-8 animate-pulse rounded-full bg-zinc-800/60" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 animate-pulse rounded bg-zinc-800/40" />
                  <div className="h-2.5 w-32 animate-pulse rounded bg-zinc-800/30" />
                </div>
              </div>
            ))
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  No audit logs match the current filters.{" "}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                "No audit logs found"
              )}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log._id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/40 p-3 transition-colors hover:bg-zinc-800/20"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-zinc-800/60 text-xs font-bold text-muted-foreground">
                  {log.actorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{log.actorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {log.action}
                    </span>
                    <Badge variant={getActionColor(log.action)} className="text-[10px]">
                      {log.targetEntity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
