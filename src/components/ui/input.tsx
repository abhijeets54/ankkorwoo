import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "border-[#e5e2d9] file:text-[#2c2c27] placeholder:text-[#8a8778] selection:bg-[#2c2c27] selection:text-[#f4f3f0] flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-[#8a8778] focus-visible:ring-[#8a8778]/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-[#ff4d4f]/20 dark:aria-invalid:ring-[#ff4d4f]/40 aria-invalid:border-[#ff4d4f]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
