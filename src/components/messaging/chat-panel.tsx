"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { TypingIndicator } from "./typing-indicator"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

export function ChatPanel({ targetUserId }: { targetUserId?: Id<"users"> }) {
  const { user: clerkUser } = useUser()
  const [open, setOpen] = React.useState(false)
  const [activeConversationId, setActiveConversationId] = React.useState<Id<"conversations"> | null>(null)

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip",
  )

  const conversations = useQuery(
    api.messages.getConversations,
    convexUser ? { userId: convexUser._id } : "skip",
  )

  const messages = useQuery(
    api.messages.getMessages,
    activeConversationId && convexUser
      ? { conversationId: activeConversationId, userId: convexUser._id }
      : "skip",
  )

  const typingIndicators = useQuery(
    api.messages.getTypingIndicators,
    activeConversationId && convexUser
      ? { conversationId: activeConversationId, currentUserId: convexUser._id }
      : "skip",
  )

  const findOrCreateConversation = useMutation(api.messages.findOrCreateConversation)
  const sendMessage = useMutation(api.messages.sendMessage)
  const markAsRead = useMutation(api.messages.markAsRead)
  const setTypingIndicator = useMutation(api.messages.setTypingIndicator)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll only when the user is already near the bottom. Closes BUG-043
  // — previously the effect ran on every `messages` change, fighting users
  // who had scrolled up to read history.
  React.useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distanceFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Mark messages as read when conversation opens
  React.useEffect(() => {
    if (activeConversationId && convexUser) {
      markAsRead({ conversationId: activeConversationId, userId: convexUser._id })
    }
  }, [activeConversationId, convexUser, markAsRead])

  // Open conversation with target user if provided
  React.useEffect(() => {
    if (targetUserId && convexUser && open) {
      findOrCreateConversation({
        userId1: convexUser._id,
        userId2: targetUserId,
      }).then((convId) => setActiveConversationId(convId))
    }
  }, [targetUserId, convexUser, open, findOrCreateConversation])

  const handleSend = React.useCallback(
    async (body: string) => {
      if (!activeConversationId || !convexUser) return
      await sendMessage({
        conversationId: activeConversationId,
        senderId: convexUser._id,
        body,
      })
    },
    [activeConversationId, convexUser, sendMessage]
  )

  // Debounce: fire `setTypingIndicator` at most every 1500 ms while the user
  // is actively typing. The server-side indicator's `expiresAt` is 3000 ms,
  // so this keeps it alive without re-mutating on every keystroke. (Closes
  // BUG-066 — previously every keystroke wrote, but the timeout ref was
  // never used to debounce, so the indicator stuck around for the full TTL.)
  const handleTyping = React.useCallback(() => {
    if (!activeConversationId || !convexUser) return
    if (typingTimeoutRef.current) return // throttle in-flight
    setTypingIndicator({ conversationId: activeConversationId, userId: convexUser._id })
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null
    }, 1500)
  }, [activeConversationId, convexUser, setTypingIndicator])

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [])

  const handleSelectConversation = React.useCallback((convId: Id<"conversations">) => {
    setActiveConversationId(convId)
  }, [])

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 outline-none select-none hover:bg-muted hover:text-foreground relative"
        onClick={() => setOpen(true)}
        aria-label="Open messages"
      >
        <MessageSquare className="size-5" />
        {totalUnread > 0 && (
          <Badge
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground"
          >
            {totalUnread > 99 ? "99+" : totalUnread}
          </Badge>
        )}
      </button>

      <SheetContent side="right" className="flex w-full max-w-md flex-col p-0">
        <SheetHeader className="border-b border-zinc-800/60 px-4 py-3">
          <SheetTitle className="text-base font-semibold">Messages</SheetTitle>
        </SheetHeader>

        {!activeConversationId ? (
          // Conversation list
          <div className="flex-1 overflow-y-auto">
            {conversations === undefined ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-10 animate-pulse rounded-full bg-zinc-800/60" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 animate-pulse rounded bg-zinc-800/40" />
                      <div className="h-3 w-40 animate-pulse rounded bg-zinc-800/30" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-zinc-800/50 p-3">
                  <MessageSquare className="size-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/60">
                  Start a conversation from the coach dashboard
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {conversations.map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv._id)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-800/30"
                  >
                    <Avatar size="default">
                      <AvatarImage src={conv.participant?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-zinc-800 text-sm">
                        {conv.participant?.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {conv.participant?.name ?? "Unknown"}
                        </span>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary p-0 text-[10px]">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                        {conv.lastMessageBody ?? "No messages yet"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Active conversation
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-zinc-800/40 px-4 py-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setActiveConversationId(null)}
                aria-label="Back to conversations"
              >
                ←
              </Button>
              {(() => {
                const conv = conversations?.find((c) => c._id === activeConversationId)
                return conv?.participant ? (
                  <>
                    <Avatar size="sm">
                      <AvatarImage src={conv.participant.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-zinc-800 text-xs">
                        {conv.participant.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{conv.participant.name}</span>
                  </>
                ) : null
              })()}
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
              {messages === undefined ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                      <div className="h-10 w-48 animate-pulse rounded-xl bg-zinc-800/40" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground/60">No messages yet</p>
                  <p className="text-xs text-muted-foreground/40">Send the first message</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg._id}
                    body={msg.body}
                    senderName={msg.senderName}
                    senderAvatarUrl={msg.senderAvatarUrl}
                    isOwn={msg.isOwn}
                    timestamp={msg._creationTime}
                    readByCount={msg.readByCount}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingIndicators && typingIndicators.length > 0 && (
              <div className="px-4 pb-1">
                <TypingIndicator names={typingIndicators.map((t) => t.name)} />
              </div>
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} onTyping={handleTyping} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
