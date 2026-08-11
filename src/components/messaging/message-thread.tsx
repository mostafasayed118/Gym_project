"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { ArrowLeft, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { TypingIndicator } from "./typing-indicator"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

interface MessageThreadProps {
  conversationId: Id<"conversations">
  userId: Id<"users">
  onBack?: () => void
  isMobile?: boolean
}

export function MessageThread({
  conversationId,
  userId,
  onBack,
  isMobile = false,
}: MessageThreadProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const messages = useQuery(api.messages.getMessages, {
    conversationId,
    userId,
  })

  const conversations = useQuery(api.messages.getConversations, { userId })

  const typingIndicators = useQuery(api.messages.getTypingIndicators, {
    conversationId,
    currentUserId: userId,
  })

  const sendMessage = useMutation(api.messages.sendMessage)
  const markAsRead = useMutation(api.messages.markAsRead)
  const setTypingIndicator = useMutation(api.messages.setTypingIndicator)

  const conversation = conversations?.find((c) => c._id === conversationId)
  const participant = conversation?.participant

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mark messages as read
  React.useEffect(() => {
    if (conversationId && userId) {
      markAsRead({ conversationId, userId })
    }
  }, [conversationId, userId, markAsRead])

  const handleSend = React.useCallback(
    async (body: string) => {
      await sendMessage({
        conversationId,
        senderId: userId,
        body,
      })
    },
    [conversationId, userId, sendMessage]
  )

  const handleTyping = React.useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    setTypingIndicator({ conversationId, userId })
  }, [conversationId, userId, setTypingIndicator])

  return (
    <div className="flex h-full flex-col bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/60 bg-zinc-900/80 px-4 py-3 backdrop-blur-xl">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="mr-1"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}

        {participant ? (
          <>
            <Avatar size="default">
              <AvatarImage src={participant.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-zinc-800 text-sm">
                {participant.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{participant.name}</h3>
              <p className="text-xs text-muted-foreground/60">Online</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="size-8 animate-pulse rounded-full bg-zinc-800/60" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-800/40" />
          </div>
        )}

        <Button variant="ghost" size="icon-sm" className="shrink-0">
          <Paperclip className="size-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages === undefined ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <div className="h-10 w-48 animate-pulse rounded-xl bg-zinc-800/40" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-zinc-800/50 p-4">
              <Avatar size="lg">
                <AvatarImage src={participant?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-zinc-800 text-lg">
                  {participant?.name?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <h3 className="text-sm font-medium">
              Start a conversation with {participant?.name ?? "this user"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Send a message to begin chatting
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const showAvatar =
                !msg.isOwn &&
                (i === 0 || messages[i - 1]?.isOwn)
              return (
                <MessageBubble
                  key={msg._id}
                  body={msg.body}
                  senderName={msg.senderName}
                  senderAvatarUrl={msg.senderAvatarUrl}
                  isOwn={msg.isOwn}
                  timestamp={msg._creationTime}
                  readByCount={msg.readByCount}
                  showAvatar={showAvatar}
                />
              )
            })}
          </div>
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
    </div>
  )
}
