"use client"

import * as React from "react"
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer"
import { FileDown, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportTemplate } from "./report-template"

interface ReportData {
  clientName: string
  coachName: string
  period: string
  stats: {
    totalSessions: number
    completedSessions: number
    totalVolume: number
    averageSessionDuration: string
    personalRecords: number
    currentStreak: number
  }
  exerciseProgress: Array<{
    exercise: string
    startWeight: number
    currentWeight: number
    improvement: number
  }>
  weeklyCheckins: Array<{
    week: number
    weight?: number
    bodyFat?: number
    notes?: string
  }>
  prs: Array<{
    exercise: string
    weight: number
    date: string
  }>
}

interface ReportGeneratorProps {
  data: ReportData
  showPreview?: boolean
}

export function ReportGenerator({ data, showPreview = false }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [showViewer, setShowViewer] = React.useState(showPreview)

  const fileName = `GymPro-Report-${data.clientName.replace(/\s+/g, "-")}-${data.period.replace(/\s+/g, "-")}.pdf`

  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Monthly Progress Report
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowViewer(!showViewer)}
            >
              {showViewer ? "Hide Preview" : "Preview"}
            </Button>
            <PDFDownloadLink
              document={<ReportTemplate data={data} />}
              fileName={fileName}
              onClick={() => setIsGenerating(true)}
            >
              {({ loading }) => (
                <Button
                  variant="default"
                  size="sm"
                  disabled={loading || isGenerating}
                >
                  {loading || isGenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileDown className="size-4" />
                  )}
                  {loading ? "Generating..." : "Download PDF"}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </CardHeader>

      {showViewer && (
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-zinc-800/60">
            <PDFViewer
              width="100%"
              height={600}
              showToolbar={false}
            >
              <ReportTemplate data={data} />
            </PDFViewer>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
