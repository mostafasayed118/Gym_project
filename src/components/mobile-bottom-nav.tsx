"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Dumbbell, MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
  },
  {
    href: "/user/session",
    label: "Workouts",
    icon: Dumbbell,
  },
  {
    href: "/user/messages",
    label: "Messages",
    icon: MessageSquare,
  },
  {
    href: "/user/dashboard",
    label: "Profile",
    icon: User,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden" aria-label="Main navigation">
      {/* Gradient border top */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      <div className="bg-zinc-900/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(item.href + "/") ?? false)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 min-w-[64px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/15"
                      : "bg-transparent group-hover:bg-accent/50"
                  )}
                  style={isActive ? {
                    boxShadow: "0 0 20px rgba(171, 214, 0, 0.3)",
                  } : undefined}
                >
                  <item.icon
                    className={cn(
                      "size-5 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                  />
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
