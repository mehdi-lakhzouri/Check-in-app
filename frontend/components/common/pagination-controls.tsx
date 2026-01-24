'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface PaginationControlsProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page size */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Show item count */
  showItemCount?: boolean;
  /** Show first/last buttons */
  showFirstLast?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showItemCount = true,
  showFirstLast = true,
  compact = false,
  className,
}: PaginationControlsProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Calculate visible item range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
    >
      {/* Left side: Page size selector & item count */}
      <div className="flex items-center gap-4">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Show
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className={cn('w-[70px]', compact && 'h-8')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              per page
            </span>
          </div>
        )}

        {showItemCount && (
          <AnimatePresence mode="wait">
            <motion.span
              key={`${startItem}-${endItem}-${totalItems}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground"
            >
              {totalItems > 0 ? (
                <>
                  Showing{' '}
                  <span className="font-medium text-foreground">
                    {startItem}-{endItem}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-foreground">
                    {totalItems}
                  </span>
                </>
              ) : (
                'No items'
              )}
            </motion.span>
          </AnimatePresence>
        )}
      </div>

      {/* Right side: Pagination buttons */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        {showFirstLast && (
          <Button
            variant="outline"
            size={compact ? 'sm' : 'icon'}
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious}
            aria-label="Go to first page"
            className={cn(compact && 'h-8 w-8')}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Previous page button */}
        <Button
          variant="outline"
          size={compact ? 'sm' : 'icon'}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Go to previous page"
          className={cn(compact && 'h-8 w-8')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page indicator */}
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium tabular-nums">
            {currentPage}
          </span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalPages || 1}
          </span>
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size={compact ? 'sm' : 'icon'}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Go to next page"
          className={cn(compact && 'h-8 w-8')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        {showFirstLast && (
          <Button
            variant="outline"
            size={compact ? 'sm' : 'icon'}
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            aria-label="Go to last page"
            className={cn(compact && 'h-8 w-8')}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Simple Pagination (Just prev/next)
// =============================================================================

export interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground px-2">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

export default PaginationControls;
