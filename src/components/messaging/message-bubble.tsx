import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MessageBubbleProps {
  body: string
  senderName: string
  senderAvatarUrl?: string | null
  isOwn: boolean
  timestamp: number
  readByCount: number
  showAvatar?: boolean
}

export function MessageBubble({
  body,
  senderName,
  senderAvatarUrl,
  isOwn,
  timestamp,
  readByCount,
  showAvatar = true,
}: MessageBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar size="sm">
              <AvatarImage src={senderAvatarUrl ?? undefined} alt={senderName} />
              <AvatarFallback className="bg-[#333627] text-xs text-[#c4c9ac]">
                {senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
        {!isOwn && showAvatar && (
          <span className="text-xs font-medium text-[#c4c9ac] px-1">
            {senderName}
          </span>
        )}
        <div
          className={cn(
            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all",
            isOwn
              ? "rounded-br-md text-[#09090b]"
              : "rounded-bl-md bg-[#1e2113] text-[#e2e4cf] border border-[rgba(68,73,51,0.5)]"
          )}
          style={isOwn ? {
            background: "linear-gradient(45deg, #abd600, #00dce5)",
          } : undefined}
        >
          {body}
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-[#c4c9ac]/60">{time}</span>
          {isOwn && readByCount > 1 && (
            <span className="text-[10px] text-[#abd600]/70 font-medium">Read</span>
          )}
        </div>
      </div>
    </div>
  )
}
