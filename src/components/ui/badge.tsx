import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md hover:shadow-lg hover:from-slate-700 hover:to-slate-600",
        secondary:
          "border-transparent bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 shadow-sm hover:shadow-md hover:from-slate-200 hover:to-slate-100",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-red-400 text-white shadow-md hover:shadow-lg hover:from-red-400 hover:to-red-300",
        outline: "text-slate-600 border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white/80 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
