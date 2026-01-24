'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FilterState {
  [key: string]: string | string[] | boolean | number | null | undefined;
}

export interface UseFiltersOptions<T extends FilterState> {
  /** Initial filter values */
  initialFilters: T;
  /** Callback when filters change */
  onChange?: (filters: T) => void;
}

export interface UseFiltersReturn<T extends FilterState> {
  /** Current filter values */
  filters: T;
  /** Set a single filter value */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Set multiple filter values at once */
  setFilters: (updates: Partial<T>) => void;
  /** Reset all filters to initial values */
  resetFilters: () => void;
  /** Reset a single filter to initial value */
  resetFilter: <K extends keyof T>(key: K) => void;
  /** Check if any filter is active (different from initial) */
  hasActiveFilters: boolean;
  /** Get list of active filter keys */
  activeFilterKeys: (keyof T)[];
  /** Get count of active filters */
  activeFilterCount: number;
  /** Clear all filters (set to undefined/null) */
  clearFilters: () => void;
  /** Clear a single filter */
  clearFilter: <K extends keyof T>(key: K) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useFilters<T extends FilterState>({
  initialFilters,
  onChange,
}: UseFiltersOptions<T>): UseFiltersReturn<T> {
  const [filters, setFiltersState] = useState<T>(initialFilters);

  // Set a single filter value
  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: value };
        onChange?.(newFilters);
        return newFilters;
      });
    },
    [onChange]
  );

  // Set multiple filter values
  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, ...updates };
        onChange?.(newFilters);
        return newFilters;
      });
    },
    [onChange]
  );

  // Reset all filters to initial values
  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    onChange?.(initialFilters);
  }, [initialFilters, onChange]);

  // Reset a single filter to initial value
  const resetFilter = useCallback(
    <K extends keyof T>(key: K) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: initialFilters[key] };
        onChange?.(newFilters);
        return newFilters;
      });
    },
    [initialFilters, onChange]
  );

  // Clear all filters (set to undefined/null/'all')
  const clearFilters = useCallback(() => {
    const clearedFilters = Object.keys(filters).reduce((acc, key) => {
      // Determine clear value based on type
      const initialValue = initialFilters[key as keyof T];
      if (typeof initialValue === 'string') {
        acc[key as keyof T] = 'all' as unknown as T[keyof T];
      } else if (Array.isArray(initialValue)) {
        acc[key as keyof T] = [] as unknown as T[keyof T];
      } else if (typeof initialValue === 'boolean') {
        acc[key as keyof T] = false as unknown as T[keyof T];
      } else {
        acc[key as keyof T] = undefined as unknown as T[keyof T];
      }
      return acc;
    }, {} as T);

    setFiltersState(clearedFilters);
    onChange?.(clearedFilters);
  }, [filters, initialFilters, onChange]);

  // Clear a single filter
  const clearFilter = useCallback(
    <K extends keyof T>(key: K) => {
      const initialValue = initialFilters[key];
      let clearValue: T[K];

      if (typeof initialValue === 'string') {
        clearValue = 'all' as unknown as T[K];
      } else if (Array.isArray(initialValue)) {
        clearValue = [] as unknown as T[K];
      } else if (typeof initialValue === 'boolean') {
        clearValue = false as unknown as T[K];
      } else {
        clearValue = undefined as unknown as T[K];
      }

      setFilter(key, clearValue);
    },
    [initialFilters, setFilter]
  );

  // Check if any filter is active
  const activeFilterKeys = useMemo(() => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key as keyof T];
      const initialValue = initialFilters[key as keyof T];

      // Check if the value is different from initial
      if (value === initialValue) return false;

      // Check if value is "empty" (null, undefined, 'all', empty array)
      if (value === null || value === undefined) return false;
      if (value === 'all') return false;
      if (Array.isArray(value) && value.length === 0) return false;

      return true;
    }) as (keyof T)[];
  }, [filters, initialFilters]);

  const hasActiveFilters = activeFilterKeys.length > 0;
  const activeFilterCount = activeFilterKeys.length;

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    resetFilter,
    hasActiveFilters,
    activeFilterKeys,
    activeFilterCount,
    clearFilters,
    clearFilter,
  };
}

export default useFilters;
