"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Home,
  Dumbbell,
  MessageSquare,
  User,
  Shield,
  BarChart3,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/user/session",
    label: "Workouts",
    icon: Dumbbell,
    roles: ["user", "coach", "admin"],
  },
  {
    href: "/user/messages",
    label: "Messages",
    icon: MessageSquare,
    roles: ["user", "coach", "admin"],
  },
  {
    href: "/user/dashboard",
    label: "My Profile",
    icon: User,
    roles: ["user"],
  },
  {
    href: "/coach/dashboard",
    label: "Coach Hub",
    icon: BarChart3,
    roles: ["coach", "admin"],
  },
  {
    href: "/coach/clients",
    label: "Clients",
    icon: Users,
    roles: ["coach", "admin"],
  },
  {
    href: "/admin/dashboard",
    label: "Admin",
    icon: Shield,
    roles: ["admin"],
  },
]

interface SidebarNavProps {
  user?: {
    name?: string
    email?: string
    avatarUrl?: string
    role?: string
  } | null
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const userRole = user?.role ?? "user"

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[240px] flex-col z-50 hidden md:flex"
      style={{
        background: "rgba(9, 9, 11, 0.5)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(68, 73, 51, 0.1)",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/dashboard" className="block">
          <span
            className="text-xl font-black tracking-tighter"
            style={{
              background: "linear-gradient(45deg, #abd600, #00dce5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            GYMPRO
          </span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname?.startsWith(item.href + "/") ?? false)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-[#abd600]/10 text-[#abd600]"
                  : "text-[#c4c9ac] hover:bg-[#333627]/50 hover:text-[#e2e4cf]"
              )}
              style={
                isActive
                  ? { boxShadow: "0 0 20px rgba(171, 214, 0, 0.15)" }
                  : undefined
              }
            >
              <item.icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="border-t border-[rgba(68,73,51,0.1)] p-4">
          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-[#333627] text-[#c4c9ac] text-xs">
                {user.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e2e4cf] truncate">
                {user.name ?? "User"}
              </p>
              <Badge
                variant={
                  userRole === "admin"
                    ? "amber"
                    : userRole === "coach"
                      ? "neon"
                      : "secondary"
                }
                className="mt-0.5 text-[9px] px-1.5 py-0"
              >
                {userRole}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
