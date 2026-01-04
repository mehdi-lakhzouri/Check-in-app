import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        // Default: Card background
        default: "bg-card text-card-foreground border-border",
        // Destructive: Red theme
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/80",
        // Success: Green theme
        success:
          "bg-success/10 text-success border-success/20 [&>svg]:text-success *:data-[slot=alert-description]:text-success/80 dark:bg-success/20",
        // Warning: Amber theme
        warning:
          "bg-warning/10 text-warning-foreground border-warning/30 [&>svg]:text-warning *:data-[slot=alert-description]:text-warning-foreground/80 dark:bg-warning/20",
        // Info: Cerulean theme
        info:
          "bg-info/10 text-info border-info/20 [&>svg]:text-info *:data-[slot=alert-description]:text-info/80 dark:bg-info/20",
        // Accent: Pumpkin Spice theme
        accent:
          "bg-accent/10 text-accent border-accent/20 [&>svg]:text-accent *:data-[slot=alert-description]:text-accent/80 dark:bg-accent/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
