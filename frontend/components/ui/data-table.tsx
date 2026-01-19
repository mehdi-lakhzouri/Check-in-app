'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Loader2,
  Inbox,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps<T> {
  /** Array of data items to display */
  data: T[];
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Unique key extractor for each row */
  getRowId: (row: T) => string;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row IDs (controlled) */
  selectedIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Enable bulk delete action */
  bulkDeleteEnabled?: boolean;
  /** Callback for bulk delete */
  onBulkDelete?: (ids: string[]) => Promise<void>;
  /** Custom delete confirmation message */
  deleteConfirmMessage?: (count: number) => React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Pagination - current page (1-indexed) */
  currentPage?: number;
  /** Pagination - total pages */
  totalPages?: number;
  /** Pagination - items per page */
  itemsPerPage?: number;
  /** Pagination - total items */
  totalItems?: number;
  /** Pagination - items per page options */
  itemsPerPageOptions?: number[];
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when items per page changes */
  onItemsPerPageChange?: (perPage: number) => void;
  /** Additional class name for container */
  className?: string;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Max height for scrollable area */
  maxHeight?: string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Custom row class name */
  getRowClassName?: (row: T) => string;
  /** ARIA label for table */
  ariaLabel?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DataTable<T>({
  data,
  columns,
  getRowId,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  bulkDeleteEnabled = false,
  onBulkDelete,
  deleteConfirmMessage,
  isLoading = false,
  skeletonRows = 5,
  emptyMessage = 'No data found',
  emptyDescription,
  emptyIcon,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  totalItems,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
  onPageChange,
  onItemsPerPageChange,
  className,
  stickyHeader = true,
  maxHeight = '600px',
  onRowClick,
  getRowClassName,
  ariaLabel = 'Data table',
}: DataTableProps<T>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  const allRowIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
  
  const isAllSelected = React.useMemo(
    () => data.length > 0 && allRowIds.every((id) => selectedIds.has(id)),
    [allRowIds, selectedIds, data.length]
  );

  const isSomeSelected = React.useMemo(
    () => allRowIds.some((id) => selectedIds.has(id)) && !isAllSelected,
    [allRowIds, selectedIds, isAllSelected]
  );

  const handleSelectAll = React.useCallback(() => {
    if (!onSelectionChange) return;
    
    if (isAllSelected) {
      // Deselect all visible rows
      const newSelection = new Set(selectedIds);
      allRowIds.forEach((id) => newSelection.delete(id));
      onSelectionChange(newSelection);
    } else {
      // Select all visible rows
      const newSelection = new Set(selectedIds);
      allRowIds.forEach((id) => newSelection.add(id));
      onSelectionChange(newSelection);
    }
  }, [isAllSelected, selectedIds, allRowIds, onSelectionChange]);

  const handleSelectRow = React.useCallback(
    (rowId: string) => {
      if (!onSelectionChange) return;
      
      const newSelection = new Set(selectedIds);
      if (newSelection.has(rowId)) {
        newSelection.delete(rowId);
      } else {
        newSelection.add(rowId);
      }
      onSelectionChange(newSelection);
    },
    [selectedIds, onSelectionChange]
  );

  // ============================================================================
  // Bulk Delete Handler
  // ============================================================================

  const handleBulkDelete = React.useCallback(async () => {
    if (!onBulkDelete) return;
    
    setIsDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      onSelectionChange?.(new Set());
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [onBulkDelete, selectedIds, onSelectionChange]);

  // ============================================================================
  // Column Alignment Helper
  // ============================================================================

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const selectedCount = selectedIds.size;
  const showBulkActions = selectable && selectedCount > 0 && bulkDeleteEnabled;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div
          className="flex items-center justify-between gap-4 p-3 bg-muted/50 border rounded-lg"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {selectedCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange?.(new Set())}
              className="text-muted-foreground"
            >
              Clear selection
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table Container */}
      <div
        className={cn(
          'relative rounded-lg border bg-card overflow-hidden',
          stickyHeader && 'overflow-auto'
        )}
        style={stickyHeader ? { maxHeight } : undefined}
      >
        <Table aria-label={ariaLabel}>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-card shadow-sm')}>
            <TableRow className="hover:bg-transparent border-b-2">
              {/* Selection Checkbox Header */}
              {selectable && (
                <TableHead className="w-12 px-4 py-3 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    // Handle indeterminate state via data attribute
                    data-state={isSomeSelected ? 'indeterminate' : isAllSelected ? 'checked' : 'unchecked'}
                    onCheckedChange={handleSelectAll}
                    aria-label={isAllSelected ? 'Deselect all rows' : 'Select all rows'}
                    className={cn(isSomeSelected && 'data-[state=indeterminate]:bg-primary/50')}
                  />
                </TableHead>
              )}
              {/* Data Columns */}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    'px-4 py-3 font-semibold text-foreground',
                    getAlignmentClass(column.align),
                    column.headerClassName
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading State */}
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                  {selectable && (
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-4 rounded" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn('px-4 py-3', getAlignmentClass(column.align))}
                    >
                      <Skeleton className="h-4 w-full max-w-[200px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              /* Empty State */
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-48"
                >
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    {emptyIcon || (
                      <Inbox
                        className="h-12 w-12 text-muted-foreground/50 mb-3"
                        aria-hidden="true"
                      />
                    )}
                    <p className="font-medium text-muted-foreground">{emptyMessage}</p>
                    {emptyDescription && (
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {emptyDescription}
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              /* Data Rows */
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.has(rowId);
                const customClassName = getRowClassName?.(row);

                return (
                  <TableRow
                    key={rowId}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'transition-colors',
                      isSelected && 'bg-primary/5',
                      onRowClick && 'cursor-pointer',
                      customClassName
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {/* Selection Checkbox */}
                    {selectable && (
                      <TableCell className="px-4 py-3 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectRow(rowId)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select row`}
                        />
                      </TableCell>
                    )}
                    {/* Data Cells */}
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          'px-4 py-3',
                          getAlignmentClass(column.align),
                          column.className
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(onPageChange || onItemsPerPageChange) && !isLoading && data.length > 0 && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2"
          role="navigation"
          aria-label="Table pagination"
        >
          {/* Items per page */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange?.(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per page</span>
            {totalItems !== undefined && (
              <span className="text-muted-foreground/70">
                ({totalItems} total)
              </span>
            )}
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(1)}
              disabled={currentPage <= 1}
              aria-label="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            <span className="px-3 text-sm tabular-nums" aria-live="polite">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage >= totalPages}
              aria-label="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteConfirmMessage ? (
                  deleteConfirmMessage(selectedCount)
                ) : (
                  <>
                    <p>
                      You are about to delete{' '}
                      <strong className="text-foreground">{selectedCount}</strong>{' '}
                      {selectedCount === 1 ? 'item' : 'items'}.
                    </p>
                    <p className="text-destructive font-medium">
                      This action cannot be undone.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Table Skeleton Component
// ============================================================================

interface DataTableSkeletonProps {
  columns: number;
  rows?: number;
  showCheckbox?: boolean;
  className?: string;
}

export function DataTableSkeleton({
  columns,
  rows = 5,
  showCheckbox = false,
  className,
}: DataTableSkeletonProps) {
  const totalColumns = columns + (showCheckbox ? 1 : 0);

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {showCheckbox && (
              <TableHead className="w-12 px-4 py-3">
                <Skeleton className="h-4 w-4 rounded" />
              </TableHead>
            )}
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-transparent">
              {showCheckbox && (
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-[150px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
