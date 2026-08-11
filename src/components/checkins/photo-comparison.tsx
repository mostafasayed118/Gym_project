"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PhotoComparisonProps {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
}

export function PhotoComparison({
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After",
}: PhotoComparisonProps) {
  // Clamp to (0, 100) — never 0 to avoid divide-by-zero in the inner image's
  // `width: 100/(sliderPosition/100)%` calculation. Closes BUG-069 / F-47.
  const [sliderPosition, setSliderPosition] = React.useState(50)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef(false)

  const handleMove = React.useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0) return
    const x = clientX - rect.left
    // Clamp to [1, 99] — keeps both sides visible AND avoids divide-by-zero.
    const percentage = Math.max(1, Math.min(99, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  // Global mouse + touch listeners. Closes BUG-069: previously the container
  // only listened to local `mousemove`, so dragging the cursor outside the
  // container froze the slider, and touch wasn't wired at all.
  React.useEffect(() => {
    const onGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      handleMove(e.clientX)
    }
    const onGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return
      const touch = e.touches[0]
      if (touch) handleMove(touch.clientX)
    }
    const onPointerUp = () => {
      isDraggingRef.current = false
    }
    window.addEventListener("mousemove", onGlobalMouseMove)
    window.addEventListener("touchmove", onGlobalTouchMove, { passive: true })
    window.addEventListener("mouseup", onPointerUp)
    window.addEventListener("touchend", onPointerUp)
    window.addEventListener("touchcancel", onPointerUp)
    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove)
      window.removeEventListener("touchmove", onGlobalTouchMove)
      window.removeEventListener("mouseup", onPointerUp)
      window.removeEventListener("touchend", onPointerUp)
      window.removeEventListener("touchcancel", onPointerUp)
    }
  }, [handleMove])

  const startDrag = React.useCallback((clientX: number) => {
    isDraggingRef.current = true
    handleMove(clientX)
  }, [handleMove])

  return (
    <div className="space-y-3">
      {/* Labels */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">{beforeLabel}</span>
        <span className="text-xs font-medium text-muted-foreground">{afterLabel}</span>
      </div>

      {/* Comparison container */}
      <div
        ref={containerRef}
        className="relative aspect-[3/4] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl border border-zinc-800/60"
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          if (touch) startDrag(touch.clientX)
        }}
      >
        {/* After image (background) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt={afterLabel}
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={beforeLabel}
            className="absolute inset-0 size-full object-cover"
            style={{
              width: `${100 / (sliderPosition / 100)}%`,
              maxWidth: "none",
            }}
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Slider handle */}
          <div
            className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-xl"
            role="slider"
            aria-label="Before/after comparison slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPosition)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault()
                setSliderPosition((p) => Math.max(1, p - 2))
              } else if (e.key === "ArrowRight") {
                e.preventDefault()
                setSliderPosition((p) => Math.min(99, p + 2))
              }
            }}
          >
            <ChevronLeft className="size-4 text-zinc-900" />
            <ChevronRight className="size-4 text-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  )
}
