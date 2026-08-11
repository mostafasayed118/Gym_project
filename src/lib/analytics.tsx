"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      persistence: "memory",
      capture_pageview: false,
      capture_pageleave: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.debug()
      },
    })

    // Closes BUG-071: previously the cleanup unconditionally called
    // `posthog.reset()` which throws if `init` was never called (i.e. when
    // the key is missing). Now the cleanup only runs if we actually initialized.
    return () => {
      try {
        posthog.reset()
      } catch {
        // PostHog may not be initialized (hot reload, key missing) — safe to ignore.
      }
    }
  }, [])

  return <>{children}</>
}

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return

    let url = window.origin + pathname
    if (searchParams.toString()) {
      url = url + `?${searchParams.toString()}`
    }

    posthog.capture("$pageview", { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.capture(event, properties)
}
