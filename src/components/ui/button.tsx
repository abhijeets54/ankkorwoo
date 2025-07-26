import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#2c2c27] text-[#f4f3f0] shadow-xs hover:bg-[#3d3d35]",
        destructive:
          "bg-[#ff4d4f] text-white shadow-xs hover:bg-[#ff4d4f]/90 focus-visible:ring-[#ff4d4f]/20 dark:focus-visible:ring-[#ff4d4f]/40",
        outline:
          "border border-[#e5e2d9] bg-[#f8f8f5] shadow-xs hover:bg-[#f4f3f0] hover:text-[#2c2c27]",
        secondary:
          "bg-[#e5e2d9] text-[#2c2c27] shadow-xs hover:bg-[#e5e2d9]/80",
        ghost: "hover:bg-[#f4f3f0] hover:text-[#2c2c27]",
        link: "text-[#2c2c27] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
