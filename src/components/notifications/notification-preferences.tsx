"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { Bell, BellOff, Dumbbell, Camera, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

interface NotificationPreferencesProps {
  userId: Id<"users">
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const prefs = useQuery(api.push.getPreferences, { userId })
  const updatePreferences = useMutation(api.push.updatePreferences)
  const [isRequesting, setIsRequesting] = React.useState(false)

  const handleEnableNotifications = React.useCallback(async () => {
    if (!("Notification" in window)) {
      alert("Your browser doesn't support notifications")
      return
    }

    setIsRequesting(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        // Register service worker and subscribe to push
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        const sub = subscription.toJSON()
        if (sub.endpoint && sub.keys) {
          // Save subscription to Convex
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              endpoint: sub.endpoint,
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            }),
          })
        }
      }
    } catch (err) {
      console.error("Failed to enable notifications:", err)
    } finally {
      setIsRequesting(false)
    }
  }, [userId])

  const handleToggle = React.useCallback(
    async (key: "workoutReminders" | "checkinReminders" | "messageNotifications", value: boolean) => {
      await updatePreferences({ userId, [key]: value })
    },
    [userId, updatePreferences],
  )

  if (prefs === undefined) {
    return (
      <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-800/40" />
                <div className="h-6 w-10 animate-pulse rounded-full bg-zinc-800/60" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isNotificationSupported = "Notification" in window
  const isNotificationGranted = isNotificationSupported && Notification.permission === "granted"

  const preferences = [
    {
      key: "workoutReminders" as const,
      label: "Workout Reminders",
      description: "Get reminded at 5 PM on workout days",
      icon: Dumbbell,
      enabled: prefs.workoutReminders,
    },
    {
      key: "checkinReminders" as const,
      label: "Weekly Check-in Reminders",
      description: "Remind me to submit progress photos",
      icon: Camera,
      enabled: prefs.checkinReminders,
    },
    {
      key: "messageNotifications" as const,
      label: "Message Notifications",
      description: "Get notified when your coach messages you",
      icon: MessageSquare,
      enabled: prefs.messageNotifications,
    },
  ]

  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage how you receive reminders and updates
            </CardDescription>
          </div>
          {!isNotificationGranted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableNotifications}
              disabled={isRequesting}
            >
              {isRequesting ? "Enabling..." : "Enable Notifications"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNotificationSupported ? (
          <div className="flex items-center gap-3 rounded-xl bg-zinc-800/30 p-4">
            <BellOff className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Your browser doesn&apos;t support push notifications
            </p>
          </div>
        ) : Notification.permission === "denied" ? (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4">
            <BellOff className="size-5 text-destructive" />
            <p className="text-sm text-destructive">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        ) : (
          preferences.map((pref) => (
            <div
              key={pref.key}
              className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-800/20 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-800/60">
                  <pref.icon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(pref.key, !pref.enabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  pref.enabled ? "bg-primary" : "bg-zinc-700",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    pref.enabled ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
