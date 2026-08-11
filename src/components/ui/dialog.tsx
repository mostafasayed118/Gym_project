"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps extends React.ComponentProps<"div"> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({ open, onOpenChange, className, children, ...props }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange?.(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      {/* Content */}
      <div className={cn("relative z-50 flex min-h-full items-center justify-center p-4", className)} {...props}>
        {children}
      </div>
    </div>
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl bg-[rgba(9,9,11,0.8)] shadow-2xl backdrop-blur-2xl border border-[rgba(68,73,51,0.2)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-bold tracking-tight text-[#e2e4cf]", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm text-[#c4c9ac]", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex justify-end gap-2 p-6 pt-0", className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
