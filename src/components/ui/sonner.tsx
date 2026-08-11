"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
  Dumbbell,
  Trophy,
  Zap,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[oklch(0.65_0.2_155)]" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          success: "cn-toast-success",
          error: "cn-toast-error",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

// Custom toast helpers for workout-specific notifications
function toastWorkoutComplete(message: string) {
  return toast.success(message, {
    icon: <Trophy className="size-4 text-[oklch(0.85_0.2_145)]" />,
  })
}

function toastSetLogged(message: string) {
  return toast.success(message, {
    icon: <Dumbbell className="size-4 text-[oklch(0.85_0.2_145)]" />,
  })
}

function toastRestComplete(message: string) {
  return toast(message, {
    icon: <Zap className="size-4 text-amber-400" />,
  })
}

export { Toaster, toastWorkoutComplete, toastSetLogged, toastRestComplete }
