"use client"

import { useState } from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "@convex/_generated/api"
import { Database, RefreshCw, KeyRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

/**
 * ExerciseDB catalog management card for Mission Control.
 *
 * The catalog is synced once (admin action) from the RapidAPI endpoint into
 * the local Convex `exercises` table; all reads are served from Convex, so the
 * API is never called per-request. This card shows catalog state and lets an
 * admin (re)trigger the bulk sync.
 */
export function ExerciseCatalogCard() {
  const stats = useQuery(api.exerciseDb.getCatalogStats)
  const syncCatalog = useAction(api.exerciseDb.syncCatalog)
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncCatalog({})
      toast.success(
        `Catalog sync started — ${result.totalExercises.toLocaleString()} exercises, ${result.scheduledPages} pages scheduled`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Catalog sync failed",
      )
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
            <Database className="size-4 text-[#abd600]" />
            Exercise Database (ExerciseDB)
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-xs ${
              stats?.apiKeyConfigured
                ? "border-[#abd600]/20 bg-[#abd600]/10 text-[#abd600]"
                : "border-[#ffb300]/30 bg-[#ffb300]/10 text-[#ffb300]"
            }`}
          >
            {stats === undefined
              ? "…"
              : stats.apiKeyConfigured
                ? "API key set"
                : "No API key"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!stats ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg bg-[#282b1d]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 rounded bg-[#282b1d]" />
              <Skeleton className="h-3 w-56 rounded bg-[#1e2113]" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#abd600]/10">
                <Database className="size-5 text-[#abd600]" />
              </div>
              <div>
                <p className="font-metric-lg text-xl font-bold tabular-nums text-[#e2e4cf]">
                  {stats.total.toLocaleString()}
                </p>
                <p className="font-label-caps text-[10px] text-[#c4c9ac] uppercase">
                  exercises · {stats.bodyPartCount} body parts
                </p>
                {stats.lastSyncedAt && (
                  <p className="mt-0.5 text-[10px] text-[#c4c9ac]/60">
                    Last synced{" "}
                    {new Date(stats.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={syncing || !stats.apiKeyConfigured}
                onClick={handleSync}
                className="gap-2 border-[#444933]/30 bg-[#1e2113]/50 text-xs text-[#c4c9ac]"
              >
                <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Starting…" : stats.total === 0 ? "Sync catalog" : "Re-sync catalog"}
              </Button>
              {!stats.apiKeyConfigured && (
                <p className="flex items-center gap-1 text-[10px] text-[#ffb300]/80">
                  <KeyRound className="size-3" />
                  Set EXERCISEDB_API_KEY in Convex env to enable sync
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
