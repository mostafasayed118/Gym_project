"use client"

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

// Register fonts (using built-in fonts for now)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
})

// Theme colors matching the GymPro dark/neon aesthetic
const colors = {
  background: "#0a0a0f",
  card: "#141419",
  neon: "#39ff14",
  neonDim: "#2bcc10",
  text: "#f5f5f5",
  muted: "#8a8a8f",
  border: "#27272a",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.neon,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.neon,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.muted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: 11,
    color: colors.text,
  },
  prBadge: {
    backgroundColor: colors.neon,
    color: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    textAlign: "center",
  },
  footerText: {
    fontSize: 10,
    color: colors.muted,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoPlaceholder: {
    width: 120,
    height: 160,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: {
    fontSize: 10,
    color: colors.muted,
  },
})

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

export function ReportTemplate({ data }: { data: ReportData }) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Monthly Progress Report</Text>
          <Text style={styles.subtitle}>
            {data.period} | Generated {now}
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Overview</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Client</Text>
              <Text style={styles.statValue}>{data.clientName}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Coach</Text>
              <Text style={styles.statValue}>{data.coachName}</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Sessions</Text>
              <Text style={styles.statValue}>{data.stats.totalSessions}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Completion Rate</Text>
              <Text style={styles.statValue}>
                {data.stats.totalSessions > 0
                  ? Math.round((data.stats.completedSessions / data.stats.totalSessions) * 100)
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Volume</Text>
              <Text style={styles.statValue}>
                {data.stats.totalVolume >= 1000
                  ? `${(data.stats.totalVolume / 1000).toFixed(1)}k kg`
                  : `${data.stats.totalVolume} kg`}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Personal Records</Text>
              <Text style={styles.statValue}>{data.stats.personalRecords}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Streak</Text>
              <Text style={styles.statValue}>{data.stats.currentStreak} days</Text>
            </View>
          </View>
        </View>

        {/* Exercise Progress */}
        {data.exerciseProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercise Progress</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Exercise</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Start</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Current</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Change</Text>
              </View>
              {data.exerciseProgress.map((ex, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{ex.exercise}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {ex.startWeight}kg
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {ex.currentWeight}kg
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 1, textAlign: "right", color: colors.success },
                    ]}
                  >
                    +{ex.improvement}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Personal Records */}
        {data.prs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <View style={styles.card}>
              {data.prs.map((pr, i) => (
                <View key={i} style={[styles.tableRow, { alignItems: "center" }]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{pr.exercise}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {pr.weight}kg
                  </Text>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.prBadge}>PR</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Weekly Check-ins */}
        {data.weeklyCheckins.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Check-ins</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Week</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Weight</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Body Fat</Text>
              </View>
              {data.weeklyCheckins.map((checkin, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>Week {checkin.week}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {checkin.weight ? `${checkin.weight}kg` : "-"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {checkin.bodyFat ? `${checkin.bodyFat}%` : "-"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            GymPro - Premium Fitness Coaching Platform
          </Text>
          <Text style={styles.footerText}>
            Generated on {now}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
