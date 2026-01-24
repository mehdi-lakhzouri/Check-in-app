'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import {
  CalendarDays,
  Calendar,
  MapPin,
  Users,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

import { useDeleteSession } from '@/lib/hooks/use-sessions';
import type { Session } from '@/lib/schemas';
import type { SortField, SortConfig } from './types';
import { formatDateTime, getSessionStatus } from './utils';

interface SessionsTableProps {
  sessions: Session[];
  totalSessions: number;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onViewDetails: (session: Session) => void;
  onEdit: (session: Session) => void;
}

export function SessionsTable({
  sessions,
  totalSessions,
  sortConfig,
  onSort,
  onViewDetails,
  onEdit,
}: SessionsTableProps) {
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Force re-render every 30 seconds to update time-based statuses
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const deleteMutation = useDeleteSession({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    },
  });

  // Pagination calculations
  const totalItems = sessions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = sessions.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = useCallback((id: string) => {
    setSessionToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteMutation.mutate(sessionToDelete);
    }
  };

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      try {
        await new Promise<void>((resolve, reject) => {
          deleteMutation.mutate(id, {
            onSuccess: () => resolve(),
            onError: () => reject(),
          });
        });
      } catch {
        // Continue with next item
      }
    }
  }, [deleteMutation]);

  // Sort indicator render function
  const renderSortIndicator = useCallback((field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" aria-hidden="true" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" aria-hidden="true" />
      : <ArrowDown className="ml-1 h-3 w-3" aria-hidden="true" />;
  }, [sortConfig]);

  // Column definitions
  const columns: DataTableColumn<Session>[] = useMemo(
    () => [
      {
        id: 'name',
        header: (
          <button 
            onClick={() => onSort('name')}
            className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
            aria-label="Sort by name"
          >
            Name
            {renderSortIndicator('name')}
          </button>
        ),
        align: 'center' as const,
        cell: (session) => (
          <div className="flex flex-col items-center">
            <span className="truncate max-w-[200px] font-medium">{session.name}</span>
            {session.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {session.description}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'startTime',
        header: (
          <button 
            onClick={() => onSort('startTime')}
            className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
            aria-label="Sort by start time"
          >
            Start Time
            {renderSortIndicator('startTime')}
          </button>
        ),
        align: 'center' as const,
        cell: (session) => (
          <div className="flex items-center justify-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            {formatDateTime(session.startTime)}
          </div>
        ),
      },
      {
        id: 'endTime',
        header: (
          <button 
            onClick={() => onSort('endTime')}
            className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
            aria-label="Sort by end time"
          >
            End Time
            {renderSortIndicator('endTime')}
          </button>
        ),
        align: 'center' as const,
        cell: (session) => (
          <div className="flex items-center justify-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            {formatDateTime(session.endTime)}
          </div>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        align: 'center' as const,
        cell: (session) => (
          session.location ? (
            <div className="flex items-center justify-center gap-1 text-sm">
              <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{session.location}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        ),
      },
      {
        id: 'status',
        header: (
          <button 
            onClick={() => onSort('isOpen')}
            className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
            aria-label="Sort by status"
          >
            Status
            {renderSortIndicator('isOpen')}
          </button>
        ),
        align: 'center' as const,
        cell: (session) => {
          const status = getSessionStatus(session);
          return (
            <div className="flex flex-col items-center gap-1">
              <Badge variant={session.isOpen ? 'default' : 'secondary'}>
                {session.isOpen ? 'Open' : 'Closed'}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs',
                  status === 'ongoing' && 'border-green-500 text-green-600',
                  status === 'upcoming' && 'border-blue-500 text-blue-600',
                  status === 'ended' && 'border-gray-400 text-gray-500'
                )}
              >
                {status === 'ongoing' ? 'In Progress' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'checkIns',
        header: (
          <button 
            onClick={() => onSort('checkInsCount')}
            className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
            aria-label="Sort by check-ins"
          >
            Check-ins
            {renderSortIndicator('checkInsCount')}
          </button>
        ),
        align: 'center' as const,
        cell: (session) => (
          <div className="flex items-center justify-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{session.checkInsCount || 0}</span>
            {session.capacity && (
              <span className="text-muted-foreground">/ {session.capacity}</span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'center' as const,
        cell: (session) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(session)}>
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(session)}>
                <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(session._id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onSort, onViewDetails, onEdit, handleDelete, renderSortIndicator]
  );

  return (
    <>
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                All Sessions
              </CardTitle>
              <CardDescription>
                {sessions.length === totalSessions
                  ? `A list of all ${totalSessions} conference sessions`
                  : `Showing ${sessions.length} of ${totalSessions} sessions`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
              <span className="text-muted-foreground/70">
                ({sessions.length} total)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={paginatedSessions}
            columns={columns}
            getRowId={(row) => row._id}
            selectable={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkDeleteEnabled={true}
            onBulkDelete={handleBulkDelete}
            deleteConfirmMessage={(count) => (
              <>
                <p>
                  You are about to delete{' '}
                  <strong className="text-foreground">{count}</strong>{' '}
                  session{count !== 1 ? 's' : ''}.
                </p>
                <p className="text-destructive font-medium mt-2">
                  This action cannot be undone. All check-ins and registrations associated with these sessions will also be affected.
                </p>
              </>
            )}
            isLoading={false}
            emptyMessage="No sessions match your filters"
            emptyDescription="Try adjusting your search or filter criteria"
            emptyIcon={<CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-3" aria-hidden="true" />}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            stickyHeader={true}
            maxHeight="600px"
            ariaLabel="Sessions table"
          />
        </CardContent>
      </Card>
      </motion.div>

      {/* Single Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteDialogOpen && (
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Delete Session
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
              All check-ins and registrations associated with this session will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        )}
      </AnimatePresence>
    </>
  );
}
