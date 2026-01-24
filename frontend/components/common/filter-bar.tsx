'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  placeholder?: string;
}

export interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

export interface FilterBarProps {
  /** Filter configurations */
  filters: FilterConfig[];
  /** Current active filter values */
  activeFilters: Record<string, string>;
  /** Callback when a filter value changes */
  onFilterChange: (key: string, value: string) => void;
  /** Callback to clear all filters */
  onClearAll?: () => void;
  /** Show active filter badges */
  showActiveBadges?: boolean;
  /** Additional className */
  className?: string;
  /** Compact mode - uses smaller buttons */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  showActiveBadges = true,
  className,
  compact = false,
}: FilterBarProps) {
  // Get list of active filters with their labels
  const activeFilterList: ActiveFilter[] = React.useMemo(() => {
    return Object.entries(activeFilters)
      .filter(([_, value]) => value && value !== 'all')
      .map(([key, value]) => {
        const filterConfig = filters.find((f) => f.key === key);
        const option = filterConfig?.options.find((o) => o.value === value);
        return {
          key,
          value,
          label: option?.label || value,
        };
      });
  }, [activeFilters, filters]);

  const hasActiveFilters = activeFilterList.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter Selects */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter
          className={cn(
            'text-muted-foreground',
            compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
          )}
        />

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={activeFilters[filter.key] || 'all'}
            onValueChange={(value) => onFilterChange(filter.key, value)}
          >
            <SelectTrigger
              className={cn(
                'w-auto gap-1',
                compact ? 'h-8 text-xs px-2' : 'h-9 text-sm px-3',
                activeFilters[filter.key] &&
                  activeFilters[filter.key] !== 'all' &&
                  'border-primary'
              )}
            >
              <SelectValue placeholder={filter.placeholder || filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Clear All Button */}
        {onClearAll && hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'default'}
              onClick={onClearAll}
              className={cn('text-muted-foreground', compact && 'h-8 px-2')}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          </motion.div>
        )}
      </div>

      {/* Active Filter Badges */}
      {showActiveBadges && hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {activeFilterList.map((filter) => (
              <motion.div
                key={`${filter.key}-${filter.value}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => onFilterChange(filter.key, 'all')}
                >
                  {filter.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label={`Remove ${filter.label} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Quick Filter Buttons (Alternative Style)
// =============================================================================

export interface QuickFilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface QuickFilterBarProps {
  options: QuickFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function QuickFilterBar({
  options,
  value,
  onChange,
  className,
}: QuickFilterBarProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {option.icon}
          {option.label}
          {option.count !== undefined && (
            <Badge
              variant={value === option.value ? 'secondary' : 'outline'}
              className="ml-1 h-5 px-1.5 text-xs"
            >
              {option.count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}

export default FilterBar;
