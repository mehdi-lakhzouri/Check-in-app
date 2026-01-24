// =============================================================================
// Hooks - Barrel Export
// =============================================================================
// Reusable React hooks for common functionality
// Import from '@/hooks' for convenience

// Pagination
export { usePagination, type UsePaginationOptions, type UsePaginationReturn } from './use-pagination';

// Search & Debounce
export {
  useDebounce,
  useDebounceSearch,
  useSearchHighlight,
  type UseDebounceSearchOptions,
  type UseDebounceSearchReturn,
  type UseSearchHighlightOptions,
  type HighlightSegment,
} from './use-debounce-search';

// Filters
export {
  useFilters,
  type FilterState,
  type UseFiltersOptions,
  type UseFiltersReturn,
} from './use-filters';

// Table Selection
export {
  useTableSelection,
  type UseTableSelectionOptions,
  type UseTableSelectionReturn,
} from './use-table-selection';
