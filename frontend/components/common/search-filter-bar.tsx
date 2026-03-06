'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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

/**
 * Configuration for a dropdown filter
 */
export interface FilterDropdownConfig {
  /** Unique identifier for this filter */
  key: string;
  /** Current value */
  value: string;
  /** Value change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder: string;
  /** Width class for the select trigger */
  width?: string;
  /** Available options */
  options: Array<{
    value: string;
    label: string;
  }>;
}

/**
 * Props for the SearchFilterBar component
 */
export interface SearchFilterBarProps {
  /** Search input value */
  search: string;
  /** Search change handler */
  onSearchChange: (value: string) => void;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Maximum width for search input */
  searchMaxWidth?: string;
  /** Array of dropdown filter configurations */
  filters?: FilterDropdownConfig[];
  /** Additional content to render in the filter row */
  extraContent?: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
  /** Whether the card should have dashed border style */
  dashedBorder?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if any filters are active
 */
function hasActiveFilters(
  search: string,
  filters: FilterDropdownConfig[]
): boolean {
  if (search !== '') return true;
  return filters.some((f) => f.value !== 'all' && f.value !== '');
}

// =============================================================================
// Component
// =============================================================================

/**
 * A unified search and filter bar component for data pages.
 * 
 * Features:
 * - Search input with clear button
 * - Configurable dropdown filters
 * - Clear all filters button
 * - Responsive layout (stacked on mobile, inline on larger screens)
 * 
 * @example
 * ```tsx
 * <SearchFilterBar
 *   search={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   searchPlaceholder="Search by name, email..."
 *   filters={[
 *     {
 *       key: 'session',
 *       value: sessionFilter,
 *       onChange: setSessionFilter,
 *       placeholder: 'All sessions',
 *       width: 'w-[200px]',
 *       options: [
 *         { value: 'all', label: 'All sessions' },
 *         ...sessions.map(s => ({ value: s._id, label: s.name }))
 *       ]
 *     },
 *     {
 *       key: 'status',
 *       value: statusFilter,
 *       onChange: setStatusFilter,
 *       placeholder: 'All statuses',
 *       width: 'w-[160px]',
 *       options: [
 *         { value: 'all', label: 'All statuses' },
 *         { value: 'active', label: 'Active' },
 *         { value: 'inactive', label: 'Inactive' },
 *       ]
 *     }
 *   ]}
 * />
 * ```
 */
export function SearchFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchMaxWidth = 'max-w-md',
  filters = [],
  extraContent,
  className,
  dashedBorder = true,
}: SearchFilterBarProps) {
  const isActive = hasActiveFilters(search, filters);

  const clearAllFilters = () => {
    onSearchChange('');
    filters.forEach((f) => f.onChange('all'));
  };

  return (
    <Card className={cn(dashedBorder && 'border-dashed', className)}>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className={cn('relative flex-1', searchMaxWidth)}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-background"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          {(filters.length > 0 || extraContent) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {filters.map((filter) => (
                <div key={filter.key} className="flex items-center gap-2">
                  <Select value={filter.value} onValueChange={filter.onChange}>
                    <SelectTrigger className={filter.width || 'w-[180px]'}>
                      <SelectValue placeholder={filter.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {extraContent}

              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchFilterBar;
