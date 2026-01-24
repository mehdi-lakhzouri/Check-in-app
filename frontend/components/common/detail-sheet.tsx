'use client';

import React from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface DetailSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Title of the sheet */
  title?: React.ReactNode;
  /** Description text */
  description?: string;
  /** Sheet content */
  children: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Custom loading skeleton */
  loadingSkeleton?: React.ReactNode;
  /** Sheet side */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Sheet size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Additional className for SheetContent */
  className?: string;
  /** Footer content */
  footer?: React.ReactNode;
  /** Aria label for the sheet */
  'aria-labelledby'?: string;
  /** Aria description for the sheet */
  'aria-describedby'?: string;
}

// =============================================================================
// Component
// =============================================================================

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-full',
};

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  isLoading = false,
  loadingSkeleton,
  side = 'right',
  size = 'xl',
  className,
  footer,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          'w-full overflow-y-auto p-0',
          sizeClasses[size],
          className
        )}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {isLoading ? (
          loadingSkeleton || <DefaultLoadingSkeleton />
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            {(title || description) && (
              <SheetHeader className="p-6 border-b">
                {title && <SheetTitle>{title}</SheetTitle>}
                {description && (
                  <SheetDescription>{description}</SheetDescription>
                )}
              </SheetHeader>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="border-t p-6 bg-muted/30">{footer}</div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// Default Loading Skeleton
// =============================================================================

function DefaultLoadingSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-label="Loading details">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default DetailSheet;
