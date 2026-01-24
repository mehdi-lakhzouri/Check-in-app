'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className */
  className?: string;
  /** Input ID for accessibility */
  id?: string;
  /** Aria label */
  'aria-label'?: string;
  /** Debounce delay in ms (0 for no debounce) */
  debounceMs?: number;
  /** Show loading state */
  isLoading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  id,
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9 bg-background"
        aria-label={ariaLabel}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export default SearchInput;
