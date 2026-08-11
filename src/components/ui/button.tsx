import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-95 active:not-aria-[haspopup]:opacity-85 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(171,214,0,0.3)] active:bg-primary/80",
        gradient:
          "bg-gradient-to-r from-[#abd600] to-[#00dce5] text-[#09090b] font-bold shadow-lg hover:shadow-[0_0_24px_rgba(171,214,0,0.35)] hover:brightness-110 active:brightness-95 active:scale-[0.98]",
        glass:
          "bg-[rgba(9,9,11,0.5)] backdrop-blur-xl border border-[rgba(68,73,51,0.2)] text-foreground hover:bg-[rgba(9,9,11,0.7)] hover:border-[rgba(68,73,51,0.4)]",
        outline:
          "border-[#444933]/50 bg-transparent text-foreground hover:bg-[#333627]/50 hover:border-[#444933]/80",
        secondary:
          "bg-[#1a1d10] text-foreground hover:bg-[#282b1d] border border-[#444933]/30",
        ghost:
          "hover:bg-[#333627]/50 hover:text-foreground",
        destructive:
          "bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 focus-visible:border-[#ffb4ab]/40 focus-visible:ring-[#ffb4ab]/20",
        success:
          "bg-[#abd600]/15 text-[#abd600] hover:bg-[#abd600]/25 focus-visible:border-[#abd600]/40 focus-visible:ring-[#abd600]/20",
        warning:
          "bg-[#ffb300]/15 text-[#ffb300] hover:bg-[#ffb300]/25 focus-visible:border-[#ffb300]/40 focus-visible:ring-[#ffb300]/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 rounded-lg px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-base rounded-xl has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xl: "h-14 gap-2 px-6 text-lg font-bold rounded-xl has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs":
          "size-7 rounded in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-lg in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
        "icon-xl": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
