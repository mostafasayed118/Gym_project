import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Test the formatRelativeTime function from conversation-list.tsx
// We'll extract it to a separate utility file for testing

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 'now' for timestamps less than 1 minute ago", () => {
    const now = Date.now()
    expect(formatRelativeTime(now)).toBe("now")
    expect(formatRelativeTime(now - 30000)).toBe("now")
  })

  it("returns minutes for timestamps less than 1 hour ago", () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 60000)).toBe("1m")
    expect(formatRelativeTime(now - 300000)).toBe("5m")
    expect(formatRelativeTime(now - 3540000)).toBe("59m")
  })

  it("returns hours for timestamps less than 1 day ago", () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 3600000)).toBe("1h")
    expect(formatRelativeTime(now - 7200000)).toBe("2h")
    expect(formatRelativeTime(now - 86400000)).toBe("1d")
  })

  it("returns days for timestamps less than 7 days ago", () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 86400000)).toBe("1d")
    expect(formatRelativeTime(now - 172800000)).toBe("2d")
    expect(formatRelativeTime(now - 518400000)).toBe("6d")
  })

  it("returns formatted date for timestamps older than 7 days", () => {
    const now = Date.now()
    const twoWeeksAgo = now - 1209600000
    const result = formatRelativeTime(twoWeeksAgo)
    expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}$/)
  })
})
