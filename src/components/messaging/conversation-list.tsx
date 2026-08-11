"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

interface ConversationListProps {
  userId: Id<"users">
  activeConversationId: Id<"conversations"> | null
  onSelect: (id: Id<"conversations">) => void
}

export function ConversationList({
  userId,
  activeConversationId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = React.useState("")

  const conversations = useQuery(api.messages.getConversations, { userId })

  const filtered = React.useMemo(() => {
    if (!conversations) return []
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        c.participant?.name?.toLowerCase().includes(q) ||
        c.lastMessageBody?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[rgba(68,73,51,0.1)] px-4 py-3">
        <h2 className="text-base font-semibold text-[#e2e4cf]">Messages</h2>
      </div>

      {/* Search */}
      <div className="border-b border-[rgba(68,73,51,0.1)] px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#c4c9ac]/50" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.3)] pl-9 text-sm placeholder:text-[#c4c9ac]/40"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations === undefined ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-11 animate-pulse rounded-full bg-[#282b1d]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-[#282b1d]" />
                  <div className="h-3 w-40 animate-pulse rounded bg-[#1e2113]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-[#333627]/50 p-3">
              <Search className="size-6 text-[#c4c9ac]/50" />
            </div>
            <p className="text-sm text-[#c4c9ac]">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {search
                ? "Try a different search term"
                : "Start a conversation from the dashboard"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {filtered.map((conv) => {
              const isActive = conv._id === activeConversationId
              const hasUnread = conv.unreadCount > 0
              const lastTime = conv.lastMessageAt
                ? formatRelativeTime(conv.lastMessageAt)
                : ""

              return (
                <button
                  key={conv._id}
                  onClick={() => onSelect(conv._id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-zinc-800/30",
                    isActive && "bg-zinc-800/40 border-l-2 border-primary"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar size="lg">
                      <AvatarImage src={conv.participant?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-zinc-800 text-sm">
                        {conv.participant?.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    {hasUnread && (
                      <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm truncate",
                          hasUnread ? "font-semibold" : "font-medium"
                        )}
                      >
                        {conv.participant?.name ?? "Unknown"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/60">
                        {lastTime}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-xs",
                        hasUnread
                          ? "text-foreground/80 font-medium"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {conv.lastMessageBody ?? "No messages yet"}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

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
