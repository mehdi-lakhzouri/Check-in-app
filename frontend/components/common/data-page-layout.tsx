'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, DataTableSkeleton, type DataTableColumn } from '@/components/ui/data-table';
import { PageHeader } from './page-header';
import { StatsGrid, type StatsGridProps } from './stats-grid';
import { StatCard, type StatCardProps } from './stat-card';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

export interface DataPageLayoutProps<T> {
  /** Page configuration */
  page: {
    icon: LucideIcon;
    title: string;
    description: string;
    /** Optional right-side header content (e.g., action buttons) */
    headerActions?: React.ReactNode;
  };

  /** Stats cards configuration */
  stats?: {
    columns?: StatsGridProps['columns'];
    cards: Array<StatCardProps & { key: string }>;
    isLoading?: boolean;
  };

  /** Filter bar component (rendered as-is) */
  filterBar?: React.ReactNode;

  /** Table configuration */
  table: {
    title: string;
    description?: string;
    /** Extra header content (counts, badges, etc.) */
    headerExtra?: React.ReactNode;
    /** Table data */
    data: T[];
    /** Column definitions */
    columns: DataTableColumn<T>[];
    /** Get row ID */
    getRowId: (row: T) => string;
    /** Is loading */
    isLoading?: boolean;
    /** Empty message */
    emptyMessage?: string;
    /** Enable selection */
    selectable?: boolean;
    /** Selected IDs */
    selectedIds?: Set<string>;
    /** Selection change handler */
    onSelectionChange?: (ids: Set<string>) => void;
    /** Bulk delete enabled */
    bulkDeleteEnabled?: boolean;
    /** Bulk delete handler */
    onBulkDelete?: (ids: string[]) => Promise<void>;
    /** Pagination - current page */
    currentPage?: number;
    /** Pagination - total pages */
    totalPages?: number;
    /** Pagination - items per page */
    itemsPerPage?: number;
    /** Pagination - total items */
    totalItems?: number;
    /** Page change handler */
    onPageChange?: (page: number) => void;
    /** Items per page change handler */
    onItemsPerPageChange?: (perPage: number) => void;
  };

  /** Loading state for the entire page */
  isLoading?: boolean;

  /** Error state */
  error?: {
    message: string;
    onRetry: () => void;
  };

  /** Additional content after the table */
  children?: React.ReactNode;
}

// =============================================================================
// Loading State Component
// =============================================================================

function DataPageLayoutLoading<T>({
  page,
  stats,
  table,
}: Pick<DataPageLayoutProps<T>, 'page' | 'stats' | 'table'>) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={page.icon}
        title={page.title}
        description="Loading..."
      />
      
      {stats && (
        <StatsGrid columns={stats.columns}>
          {stats.cards.map((card) => (
            <StatCard
              key={card.key}
              title=""
              value=""
              isLoading
            />
          ))}
        </StatsGrid>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTableSkeleton columns={table.columns.length} rows={5} />
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Error State Component
// =============================================================================

function DataPageLayoutError<T>({
  page,
  error,
}: Pick<DataPageLayoutProps<T>, 'page' | 'error'>) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={page.icon}
        title={page.title}
        description={page.description}
      />
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error?.message || 'An error occurred'}</p>
        <Button onClick={error?.onRetry}>Retry</Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DataPageLayout<T>({
  page,
  stats,
  filterBar,
  table,
  isLoading,
  error,
  children,
}: DataPageLayoutProps<T>) {
  // Loading state
  if (isLoading) {
    return <DataPageLayoutLoading page={page} stats={stats} table={table} />;
  }

  // Error state
  if (error) {
    return <DataPageLayoutError page={page} error={error} />;
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <PageHeader
        icon={page.icon}
        title={page.title}
        description={page.description}
        rightContent={page.headerActions}
      />

      {/* Stats Cards */}
      {stats && (
        <StatsGrid columns={stats.columns}>
          {stats.cards.map(({ key, ...cardProps }) => (
            <StatCard
              key={key}
              {...cardProps}
              isLoading={stats.isLoading}
            />
          ))}
        </StatsGrid>
      )}

      {/* Filter Bar */}
      {filterBar && (
        <motion.div variants={cardVariants}>
          {filterBar}
        </motion.div>
      )}

      {/* Data Table */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{table.title}</CardTitle>
                {table.description && (
                  <CardDescription>{table.description}</CardDescription>
                )}
              </div>
              {table.headerExtra}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable<T>
              data={table.data}
              columns={table.columns}
              getRowId={table.getRowId}
              selectable={table.selectable}
              selectedIds={table.selectedIds}
              onSelectionChange={table.onSelectionChange}
              bulkDeleteEnabled={table.bulkDeleteEnabled}
              onBulkDelete={table.onBulkDelete}
              isLoading={table.isLoading}
              emptyMessage={table.emptyMessage}
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              itemsPerPage={table.itemsPerPage}
              totalItems={table.totalItems}
              onPageChange={table.onPageChange}
              onItemsPerPageChange={table.onItemsPerPageChange}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Additional Content */}
      {children}
    </motion.div>
  );
}

export default DataPageLayout;
