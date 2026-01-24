// =============================================================================
// Common Components - Barrel Export
// =============================================================================
// Reusable components shared across multiple pages/features
// Import from '@/components/common' for convenience

// Layout Components
export { PageHeader } from './page-header';
export type { PageHeaderProps } from './page-header';

// Form Components
export { SearchInput } from './search-input';
export type { SearchInputProps } from './search-input';

// Dialog Components
export { DeleteConfirmDialog } from './delete-confirm-dialog';
export type { DeleteConfirmDialogProps } from './delete-confirm-dialog';

export { DetailSheet } from './detail-sheet';
export type { DetailSheetProps } from './detail-sheet';

// Status Components
export { ConnectionStatus } from './connection-status';
export type { ConnectionStatusProps, ConnectionState } from './connection-status';

// Stats Components
export { StatsGrid } from './stats-grid';
export type { StatsGridProps } from './stats-grid';

export { StatCard, MiniStatCard } from './stat-card';
export type { StatCardProps, MiniStatCardProps } from './stat-card';

// Filter Components
export { FilterBar, QuickFilterBar } from './filter-bar';
export type {
  FilterBarProps,
  FilterConfig,
  FilterOption,
  ActiveFilter,
  QuickFilterBarProps,
  QuickFilterOption,
} from './filter-bar';

// Pagination Components
export { PaginationControls, SimplePagination } from './pagination-controls';
export type {
  PaginationControlsProps,
  SimplePaginationProps,
} from './pagination-controls';

// State Display Components
export {
  EmptyState,
  ErrorState,
  LoadingState,
  NoConnectionState,
  EmptyStateCard,
  ErrorStateCard,
} from './state-displays';
export type {
  EmptyStateProps,
  ErrorStateProps,
  LoadingStateProps,
  NoConnectionStateProps,
} from './state-displays';
