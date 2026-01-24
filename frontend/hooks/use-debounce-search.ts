'use client';

import { useState, useEffect, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UseDebounceSearchOptions<T> {
  /** Array of items to search */
  items: T[];
  /** Fields to search in each item */
  searchFields: (keyof T)[];
  /** Debounce delay in milliseconds */
  delay?: number;
  /** Initial search query */
  initialQuery?: string;
  /** Minimum query length to trigger search */
  minQueryLength?: number;
  /** Case sensitive search */
  caseSensitive?: boolean;
}

export interface UseDebounceSearchReturn<T> {
  /** Current search query (immediate) */
  query: string;
  /** Debounced search query */
  debouncedQuery: string;
  /** Filtered items */
  filteredItems: T[];
  /** Is currently debouncing */
  isDebouncing: boolean;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Clear the search query */
  clearQuery: () => void;
  /** Number of filtered items */
  resultCount: number;
  /** Whether there are any results */
  hasResults: boolean;
}

// =============================================================================
// useDebounce Hook (Low-level)
// =============================================================================

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// useDebounceSearch Hook
// =============================================================================

export function useDebounceSearch<T extends Record<string, any>>({
  items,
  searchFields,
  delay = 300,
  initialQuery = '',
  minQueryLength = 0,
  caseSensitive = false,
}: UseDebounceSearchOptions<T>): UseDebounceSearchReturn<T> {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, delay);

  // Track if we're currently debouncing
  const isDebouncing = query !== debouncedQuery;

  // Filter items based on debounced query
  const filteredItems = useMemo(() => {
    // If query is too short, return all items
    if (debouncedQuery.length < minQueryLength) {
      return items;
    }

    const searchTerm = caseSensitive
      ? debouncedQuery
      : debouncedQuery.toLowerCase();

    return items.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;

        const stringValue = String(value);
        const compareValue = caseSensitive
          ? stringValue
          : stringValue.toLowerCase();

        return compareValue.includes(searchTerm);
      });
    });
  }, [items, debouncedQuery, searchFields, minQueryLength, caseSensitive]);

  // Clear the search query
  const clearQuery = () => setQuery('');

  return {
    query,
    debouncedQuery,
    filteredItems,
    isDebouncing,
    setQuery,
    clearQuery,
    resultCount: filteredItems.length,
    hasResults: filteredItems.length > 0,
  };
}

// =============================================================================
// useSearchHighlight Hook (Bonus)
// =============================================================================

export interface UseSearchHighlightOptions {
  text: string;
  query: string;
  caseSensitive?: boolean;
}

export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

export function useSearchHighlight({
  text,
  query,
  caseSensitive = false,
}: UseSearchHighlightOptions): HighlightSegment[] {
  return useMemo(() => {
    if (!query || !text) {
      return [{ text, isMatch: false }];
    }

    const searchTerm = caseSensitive ? query : query.toLowerCase();
    const compareText = caseSensitive ? text : text.toLowerCase();

    const segments: HighlightSegment[] = [];
    let lastIndex = 0;

    let index = compareText.indexOf(searchTerm);
    while (index !== -1) {
      // Add non-matching segment before match
      if (index > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, index),
          isMatch: false,
        });
      }

      // Add matching segment
      segments.push({
        text: text.slice(index, index + query.length),
        isMatch: true,
      });

      lastIndex = index + query.length;
      index = compareText.indexOf(searchTerm, lastIndex);
    }

    // Add remaining non-matching text
    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        isMatch: false,
      });
    }

    return segments.length > 0 ? segments : [{ text, isMatch: false }];
  }, [text, query, caseSensitive]);
}

export default useDebounceSearch;
