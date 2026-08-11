import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#ffb4ab] aria-invalid:ring-[#ffb4ab]/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-[#c3f400] text-[#09090b] [a]:hover:bg-[#abd600]",
        secondary:
          "bg-[#333627] text-[#e2e4cf] [a]:hover:bg-[#333627]/80",
        destructive:
          "bg-[#ffb4ab]/10 text-[#ffb4ab] [a]:hover:bg-[#ffb4ab]/20",
        outline:
          "border-[#444933] text-[#e2e4cf] [a]:hover:bg-[#333627]/50 [a]:hover:text-[#c4c9ac]",
        ghost:
          "hover:bg-[#333627]/50 hover:text-[#c4c9ac]",
        link: "text-primary underline-offset-4 hover:underline",
        neon:
          "bg-[#abd600]/10 text-[#abd600] border border-[#abd600]/20",
        amber:
          "bg-[#ffb300]/10 text-[#ffb300] border border-[#ffb300]/30",
        teal:
          "bg-[#00dce5]/10 text-[#00dce5] border border-[#00dce5]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
