import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-200 ease-out overflow-hidden",
  {
    variants: {
      variant: {
        // Primary: Rich Cerulean
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        // Secondary: Platinum
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        // Destructive: Red
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        // Outline: Silver border
        outline:
          "border-border text-foreground [a&]:hover:bg-secondary [a&]:hover:text-secondary-foreground",
        // Accent: Pumpkin Spice
        accent:
          "border-transparent bg-accent text-accent-foreground [a&]:hover:bg-accent/90",
        // Success: Green
        success:
          "border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90",
        // Warning: Amber
        warning:
          "border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90",
        // Info: Cerulean
        info:
          "border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90",
        // Azure: Steel Azure
        azure:
          "border-transparent bg-azure text-azure-foreground [a&]:hover:bg-azure/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
