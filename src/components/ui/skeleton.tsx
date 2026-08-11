import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "shimmer" }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md",
        variant === "shimmer"
          ? "skeleton-shimmer"
          : "animate-pulse bg-[#282b1d]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
