"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { MessageSquare } from "lucide-react"
import { ConversationList } from "./conversation-list"
import { MessageThread } from "./message-thread"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

interface ChatLayoutProps {
  className?: string
  initialConversationId?: Id<"conversations">
}

export function ChatLayout({ className, initialConversationId }: ChatLayoutProps) {
  const { user: clerkUser } = useUser()
  const [activeConversationId, setActiveConversationId] =
    React.useState<Id<"conversations"> | null>(initialConversationId ?? null)

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
  )

  // Track the viewport width via useSyncExternalStore instead of syncing a
  // state copy in an effect (react-hooks/set-state-in-effect). The server
  // snapshot (false) keeps SSR/hydration consistent.
  const isMobileView = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        window.addEventListener("resize", onStoreChange)
        return () => window.removeEventListener("resize", onStoreChange)
      },
      []
    ),
    () => window.innerWidth < 768,
    () => false
  )

  // Follow the `initialConversationId` prop when it changes — adjusted during
  // render (React's "storing information from previous renders" pattern)
  // instead of in an effect, which react-hooks/set-state-in-effect flags.
  const [prevInitialConversationId, setPrevInitialConversationId] =
    React.useState(initialConversationId)
  if (prevInitialConversationId !== initialConversationId) {
    setPrevInitialConversationId(initialConversationId)
    if (initialConversationId) {
      setActiveConversationId(initialConversationId)
    }
  }

  if (!convexUser) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "#111508" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 animate-pulse rounded-full bg-[#282b1d]" />
          <p className="text-sm text-[#c4c9ac]">Loading messages...</p>
        </div>
      </div>
    )
  }

  // Mobile: show list or thread
  if (isMobileView) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        {activeConversationId ? (
          <MessageThread
            conversationId={activeConversationId}
            userId={convexUser._id}
            onBack={() => setActiveConversationId(null)}
            isMobile
          />
        ) : (
          <ConversationList
            userId={convexUser._id}
            activeConversationId={activeConversationId}
            onSelect={setActiveConversationId}
          />
        )}
      </div>
    )
  }

  // Desktop: split pane
  return (
    <div className={cn("flex h-full", className)}>
      {/* Left pane - Conversation List */}
      <div
        className="w-80 shrink-0 border-r border-[rgba(68,73,51,0.1)]"
        style={{ background: "rgba(9, 9, 11, 0.5)", backdropFilter: "blur(24px)" }}
      >
        <ConversationList
          userId={convexUser._id}
          activeConversationId={activeConversationId}
          onSelect={setActiveConversationId}
        />
      </div>

      {/* Right pane - Message Thread */}
      <div className="flex-1 min-w-0">
        {activeConversationId ? (
          <MessageThread
            conversationId={activeConversationId}
            userId={convexUser._id}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-[#333627]/50 p-4">
        <MessageSquare className="size-8 text-[#c4c9ac]/40" />
      </div>
      <h3 className="text-lg font-medium text-[#e2e4cf]/80">Select a conversation</h3>
      <p className="mt-1 max-w-xs text-sm text-[#c4c9ac]/60">
        Choose a conversation from the sidebar to start messaging
      </p>
    </div>
  )
}
