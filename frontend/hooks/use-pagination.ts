'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UsePaginationOptions {
  /** Initial page (1-indexed) */
  initialPage?: number;
  /** Initial page size */
  initialPageSize?: number;
  /** Total number of items */
  totalItems: number;
  /** Callback when page or page size changes */
  onChange?: (page: number, pageSize: number) => void;
}

export interface UsePaginationReturn {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Current page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there's a previous page */
  hasPreviousPage: boolean;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Start index for slicing data (0-indexed) */
  startIndex: number;
  /** End index for slicing data (0-indexed, exclusive) */
  endIndex: number;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Go to the first page */
  firstPage: () => void;
  /** Go to the last page */
  lastPage: () => void;
  /** Change the page size */
  setPageSize: (size: number) => void;
  /** Reset pagination to initial state */
  reset: () => void;
  /** Paginate an array of items */
  paginateItems: <T>(items: T[]) => T[];
}

// =============================================================================
// Hook
// =============================================================================

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  totalItems,
  onChange,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  // Calculate start and end indices
  const startIndex = useMemo(
    () => (currentPage - 1) * pageSize,
    [currentPage, pageSize]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + pageSize, totalItems),
    [startIndex, pageSize, totalItems]
  );

  // Navigation helpers
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  // Go to a specific page
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
      onChange?.(validPage, pageSize);
    },
    [totalPages, pageSize, onChange]
  );

  // Navigation methods
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [hasNextPage, currentPage, goToPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  }, [hasPreviousPage, currentPage, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  // Change page size
  const setPageSize = useCallback(
    (size: number) => {
      const newTotalPages = Math.max(1, Math.ceil(totalItems / size));
      const newPage = Math.min(currentPage, newTotalPages);
      setPageSizeState(size);
      setCurrentPage(newPage);
      onChange?.(newPage, size);
    },
    [totalItems, currentPage, onChange]
  );

  // Reset to initial state
  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(initialPageSize);
    onChange?.(initialPage, initialPageSize);
  }, [initialPage, initialPageSize, onChange]);

  // Paginate an array of items
  const paginateItems = useCallback(
    <T,>(items: T[]): T[] => {
      return items.slice(startIndex, endIndex);
    },
    [startIndex, endIndex]
  );

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    hasPreviousPage,
    hasNextPage,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    reset,
    paginateItems,
  };
}

export default usePagination;
