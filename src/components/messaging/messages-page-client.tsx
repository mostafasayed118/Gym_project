"use client"

import { ChatLayout } from "./chat-layout"

export function MessagesPageClient() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatLayout />
    </div>
  )
}
