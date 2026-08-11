"use client"

import * as React from "react"
import { triggerHapticFeedback } from "@/hooks/use-pr-detection"

interface PRCelebrationProps {
  show: boolean
  exerciseName: string
  newWeight: number
  previousWeight: number
  onAnimationEnd?: () => void
}

function ConfettiParticle({ index }: { index: number }) {
  const colors = [
    "#abd600", // Neon lime
    "#00dce5", // Teal
    "#c3f400", // Bright lime
    "#ffb300", // Amber
    "#00f4fe", // Cyan
  ]

  const color = colors[index % colors.length]
  // Randomize once per particle so re-renders don't jitter the animation.
  const [random] = React.useState(() => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1.5,
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? "50%" : Math.random() > 0.5 ? "2px" : "0",
  }))

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${random.left}%`,
        top: "-10px",
        width: `${random.size}px`,
        height: `${random.size}px`,
        backgroundColor: color,
        borderRadius: random.shape,
        animation: `confetti-fall ${random.duration}s ease-in ${random.delay}s forwards`,
        transform: `rotate(${random.rotation}deg)`,
      }}
    />
  )
}

function SparkleEffect() {
  // Randomize sparkle positions once per mount.
  const [sparkles] = React.useState(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * 360
      const distance = 80 + Math.random() * 40
      return {
        x: Math.cos((angle * Math.PI) / 180) * distance,
        y: Math.sin((angle * Math.PI) / 180) * distance,
        delay: i * 0.05,
      }
    }),
  )

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparkles.map((s, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 size-2 rounded-full bg-[#abd600]"
          style={{
            transform: `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px))`,
            animation: `sparkle 0.6s ease-out ${s.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  )
}

export function PRCelebration({
  show,
  exerciseName,
  newWeight,
  previousWeight,
  onAnimationEnd,
}: PRCelebrationProps) {
  const [visible, setVisible] = React.useState(false)

  // Show the celebration as soon as `show` turns true. Doing this during
  // render (React's "adjusting state when a prop changes" pattern) instead of
  // in an effect avoids a state-sync effect.
  if (show && !visible) {
    setVisible(true)
  }

  // Re-run the timer when the PR identity changes (back-to-back PRs replace
  // `lastPR` in the parent without `show` toggling, so we must include the
  // payload in the dep list — otherwise the FIRST PR's expiry fires
  // `onAnimationEnd` on the SECOND PR. Closes BUG-067.
  React.useEffect(() => {
    if (!show) return
    triggerHapticFeedback()
    const timer = setTimeout(() => {
      setVisible(false)
      onAnimationEnd?.()
    }, 3500)
    return () => clearTimeout(timer)
  }, [show, exerciseName, newWeight, previousWeight, onAnimationEnd])

  if (!visible) return null

  const improvement = previousWeight > 0
    ? Math.round(((newWeight - previousWeight) / previousWeight) * 100)
    : 100

  return (
    <div
      // z-[70] sits above admin dialogs (z-[60]) and the Sheet portal (z-50).
      // Closes BUG-045 (PR celebration sometimes hidden behind open chat sheet).
      className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="New personal record achieved"
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Confetti overlay */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Sparkle effect */}
      <SparkleEffect />

      {/* PR Card */}
      <div className="relative animate-pr-bounce-in">
        {/* Outer glow */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[rgba(171,214,0,0.4)] via-[rgba(0,220,229,0.4)] to-[rgba(195,244,0,0.4)] blur-2xl animate-pulse-glow" />

        {/* Card with glassmorphism */}
        <div className="relative rounded-3xl border border-[rgba(171,214,0,0.3)] bg-[rgba(9,9,11,0.8)] px-10 py-8 text-center backdrop-blur-2xl shadow-2xl">
          {/* Trophy icon with glow */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#abd600] to-[#00dce5] blur-lg opacity-60" />
              <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#abd600] to-[#00dce5] text-4xl shadow-lg">
                🏆
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gradient-neon tracking-tight">
            NEW PR!
          </h3>
          <p className="mt-2 text-base text-[#c4c9ac] font-medium">
            {exerciseName}
          </p>

          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-[#c4c9ac]/60 uppercase tracking-wider">
                Previous
              </p>
              <p className="mt-1 text-2xl font-bold text-[#c4c9ac]">
                {previousWeight}
                <span className="text-sm font-normal text-[#c4c9ac]/50">kg</span>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl text-[#abd600]">→</div>
              {improvement > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#abd600]/10 px-2 py-0.5">
                  <span className="text-[10px] font-bold text-[#abd600]">
                    +{improvement}%
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-[#c4c9ac]/60 uppercase tracking-wider">
                New Best
              </p>
              <p className="mt-1 text-2xl font-bold text-[#abd600] glow-neon-sm">
                {newWeight}
                <span className="text-sm font-normal text-[#abd600]/70">kg</span>
              </p>
            </div>
          </div>

          {/* Dismiss hint */}
          <p className="mt-6 text-[10px] text-[#c4c9ac]/40">
            Auto-dismissing in 3 seconds
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(0);
          }
        }
      `}</style>
    </div>
  )
}
