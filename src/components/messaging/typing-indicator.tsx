"use client"

interface TypingIndicatorProps {
  names: string[]
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex items-center gap-1 rounded-xl bg-zinc-800/50 px-3 py-2 border border-zinc-700/30">
        <div className="flex gap-1">
          <span className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
        <span className="text-xs text-muted-foreground/70">{label}</span>
      </div>
    </div>
  )
}
