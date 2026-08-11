"use client"

import * as React from "react"
import { Send, Paperclip, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  /**
   * Send handler. May be async — `<ChatInput>` will await it before clearing
   * the textarea, and will restore the unsent text if it throws. Closes
   * BUG-047 where the textarea cleared synchronously and a failed mutation
   * silently lost the user's text.
   */
  onSend: (body: string) => void | Promise<void>
  onTyping?: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [value])

  const handleSend = React.useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || disabled || isSending) return

    setIsSending(true)
    setValue("")
    try {
      await onSend(trimmed)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
      textareaRef.current?.focus()
    } catch {
      // Restore unsent text so the user can retry. (Closes BUG-047.)
      setValue(trimmed)
    } finally {
      setIsSending(false)
    }
  }, [value, disabled, isSending, onSend])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      onTyping?.()
    },
    [onTyping]
  )

  return (
    <div
      className="border-t border-[rgba(68,73,51,0.1)]"
      style={{ background: "rgba(12, 15, 4, 0.8)", backdropFilter: "blur(24px)" }}
    >
      <div className="flex items-end gap-2 p-3">
        {/* Attachments button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-[#c4c9ac]/60 hover:text-[#e2e4cf]"
          disabled={disabled}
          aria-label="Attach file"
        >
          <Paperclip className="size-5" />
        </Button>

        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            aria-label={placeholder}
            className={cn(
              "w-full resize-none rounded-xl border border-[rgba(68,73,51,0.2)] bg-[rgba(9,9,11,0.5)] px-4 py-2.5 pr-10 text-sm text-[#e2e4cf]",
              "placeholder:text-[#c4c9ac]/50",
              "outline-none focus:border-[#abd600]/50 focus:ring-1 focus:ring-[#abd600]/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[120px] min-h-[40px]"
            )}
            style={{ backdropFilter: "blur(24px)" }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#c4c9ac]/40 hover:text-[#e2e4cf]"
            disabled={disabled}
            aria-label="Add emoji"
          >
            <Smile className="size-4" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          size="icon"
          variant="default"
          onClick={handleSend}
          disabled={!value.trim() || disabled || isSending}
          aria-label={isSending ? "Sending..." : "Send message"}
          className={cn(
            "shrink-0 rounded-xl transition-all",
            value.trim() && !isSending && "glow-neon-sm",
            isSending && "opacity-60",
          )}
        >
          <Send className={cn("size-4", isSending && "animate-pulse")} />
        </Button>
      </div>

      {/* Helper text */}
      <div className="px-4 pb-2">
        <p className="text-[10px] text-[#c4c9ac]/40">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
