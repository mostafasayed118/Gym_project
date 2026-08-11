import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-lg border border-[#444933]/40 bg-[#09090b] px-3.5 py-3 text-base text-foreground transition-all outline-none placeholder:text-[#c4c9ac]/40 focus:border-[#abd600] focus:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#1e2113]/50 disabled:opacity-50 aria-invalid:border-[#ffb4ab] aria-invalid:ring-3 aria-invalid:ring-[#ffb4ab]/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
