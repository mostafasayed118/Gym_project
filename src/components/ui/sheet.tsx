"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

type SheetSide = "top" | "bottom" | "left" | "right"

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 bg-[#1e2113] p-6 shadow-lg transition-all duration-300 ease-in-out border-[rgba(68,73,51,0.2)]",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b",
        bottom: "inset-x-0 bottom-0 border-t",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: SheetSide
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
  side: "right",
})

function useSheetContext() {
  return React.useContext(SheetContext)
}

function Sheet({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  side = "right",
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  side?: SheetSide
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange, side }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  children,
  asChild,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = useSheetContext()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: (e: React.MouseEvent) => {
        onOpenChange(true)
        const childProps = (children as React.ReactElement<Record<string, unknown>>).props
        if (typeof childProps.onClick === "function") childProps.onClick(e)
      },
    })
  }

  return (
    <button {...props} onClick={() => onOpenChange(true)}>
      {children}
    </button>
  )
}

function SheetClose({
  children,
  ...props
}: React.ComponentProps<"button">) {
  const { onOpenChange } = useSheetContext()
  return (
    <button {...props} onClick={() => onOpenChange(false)}>
      {children}
    </button>
  )
}

function SheetPortal({ children }: { children: React.ReactNode }) {
  // Hydration guard: only mount portal children on the client, after hydration
  // (server snapshot false). useSyncExternalStore avoids the setState-in-effect
  // pattern the react-hooks rule flags.
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false
  )
  if (!mounted) return null
  return <>{children}</>
}

function SheetOverlay({ className, ...props }: React.ComponentProps<"div">) {
  const context = useSheetContext()
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      onClick={() => context.onOpenChange(false)}
      {...props}
    />
  )
}

function SheetContent({
  children,
  side = "right",
  className,
  ...props
}: React.ComponentProps<"div"> & { side?: SheetSide }) {
  const { open } = useSheetContext()

  if (!open) return null

  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        role="dialog"
        aria-modal="true"
        data-state={open ? "open" : "closed"}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
      </div>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-semibold text-[#e2e4cf]", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-[#c4c9ac]", className)} {...props} />
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
