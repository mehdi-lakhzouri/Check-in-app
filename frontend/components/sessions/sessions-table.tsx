'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Calendar,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';

import { useDeleteSession } from '@/lib/hooks/use-sessions';
import type { Session } from '@/lib/schemas';
import type { SortField, SortConfig } from './types';
import { formatDateTime, getSessionStatus } from './utils';

// Animation variants
const tableRowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

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
  
  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
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

  // Selection helpers
  const allOnPageSelected = useMemo(() => {
    return paginatedSessions.length > 0 && paginatedSessions.every(s => selectedIds.has(s._id));
  }, [paginatedSessions, selectedIds]);

  const someOnPageSelected = useMemo(() => {
    return paginatedSessions.some(s => selectedIds.has(s._id)) && !allOnPageSelected;
  }, [paginatedSessions, selectedIds, allOnPageSelected]);

  // Reset selection when page changes - use useEffect with setTimeout
  const selectionResetKey = `${currentPage}-${itemsPerPage}`;
  const prevSelectionResetKeyRef = React.useRef(selectionResetKey);
  React.useEffect(() => {
    if (prevSelectionResetKeyRef.current !== selectionResetKey) {
      prevSelectionResetKeyRef.current = selectionResetKey;
      if (selectedIds.size > 0) {
        setTimeout(() => setSelectedIds(new Set()), 0);
      }
    }
  }, [selectionResetKey, selectedIds.size]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      paginatedSessions.forEach(s => newSelected.add(s._id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedSessions.forEach(s => newSelected.delete(s._id));
      setSelectedIds(newSelected);
    }
  }, [paginatedSessions, selectedIds]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const handleDelete = (id: string) => {
    setSessionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteMutation.mutate(sessionToDelete);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);
    
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
    
    setIsBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
  };

  // Sort indicator render function
  const renderSortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" aria-hidden="true" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" aria-hidden="true" />
      : <ArrowDown className="ml-1 h-3 w-3" aria-hidden="true" />;
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-linear-to-r from-muted/50 to-transparent">
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
            <div className="flex items-center gap-3">
              {/* Bulk Delete Button */}
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete ({selectedIds.size})
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select 
                  value={String(itemsPerPage)} 
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
              <Badge variant="secondary" className="text-sm">
                {totalSessions} total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table role="table" aria-label="Sessions list">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[50px] text-center" scope="col">
                  <Checkbox
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) {
                        (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someOnPageSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all sessions on this page"
                  />
                </TableHead>
                <TableHead className="text-center" scope="col">
                  <button 
                    onClick={() => onSort('name')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
                    aria-label="Sort by name"
                  >
                    Name
                    {renderSortIndicator('name')}
                  </button>
                </TableHead>
                <TableHead className="text-center" scope="col">
                  <button 
                    onClick={() => onSort('startTime')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
                    aria-label="Sort by start time"
                  >
                    Start Time
                    {renderSortIndicator('startTime')}
                  </button>
                </TableHead>
                <TableHead className="text-center" scope="col">
                  <button 
                    onClick={() => onSort('endTime')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
                    aria-label="Sort by end time"
                  >
                    End Time
                    {renderSortIndicator('endTime')}
                  </button>
                </TableHead>
                <TableHead className="text-center" scope="col">Location</TableHead>
                <TableHead className="text-center" scope="col">
                  <button 
                    onClick={() => onSort('isOpen')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
                    aria-label="Sort by status"
                  >
                    Status
                    {renderSortIndicator('isOpen')}
                  </button>
                </TableHead>
                <TableHead className="text-center" scope="col">
                  <button 
                    onClick={() => onSort('checkInsCount')}
                    className="flex items-center justify-center w-full hover:text-foreground transition-colors font-semibold"
                    aria-label="Sort by check-ins"
                  >
                    Check-ins
                    {renderSortIndicator('checkInsCount')}
                  </button>
                </TableHead>
                <TableHead className="text-center w-[140px]" scope="col">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedSessions.length > 0 ? (
                  paginatedSessions.map((session, index) => {
                    const status = getSessionStatus(session);
                    const isSelected = selectedIds.has(session._id);
                    return (
                      <motion.tr
                        key={session._id}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ delay: index * 0.02, duration: 0.15 }}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50",
                          isSelected && "bg-primary/5"
                        )}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(session._id, !!checked)}
                            aria-label={`Select ${session.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-center">
                          <div className="flex flex-col items-center">
                            <span className="truncate max-w-[200px]">{session.name}</span>
                            {session.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {session.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            {formatDateTime(session.startTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            {formatDateTime(session.endTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {session.location ? (
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                              <span className="truncate max-w-[120px]">{session.location}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
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
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <span className="font-medium">{session.checkInsCount || 0}</span>
                            {session.capacity && (
                              <span className="text-muted-foreground">/ {session.capacity}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onViewDetails(session)}
                                    aria-label={`View details for ${session.name}`}
                                  >
                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onEdit(session)}
                                    aria-label={`Edit ${session.name}`}
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(session._id)}
                                    aria-label={`Delete ${session.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32">
                      <div className="flex flex-col items-center justify-center text-center">
                        <CalendarDays className="h-10 w-10 text-muted-foreground/50 mb-2" aria-hidden="true" />
                        <p className="text-muted-foreground font-medium">
                          No sessions match your filters
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav 
              className="flex items-center justify-between border-t px-6 py-4 bg-muted/20"
              aria-label="Sessions table pagination"
            >
              <div className="text-sm text-muted-foreground" aria-live="polite">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="Go to first page"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, arr) => {
                      const prevPage = arr[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground" aria-hidden="true">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(page)}
                            aria-label={`Go to page ${page}`}
                            aria-current={currentPage === page ? 'page' : undefined}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Go to next page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to last page"
                >
                  Last
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>

      {/* Single Delete Confirmation Dialog */}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Delete Multiple Sessions
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to delete{' '}
                  <strong className="text-foreground">{selectedIds.size}</strong>{' '}
                  session{selectedIds.size !== 1 ? 's' : ''}.
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone. All check-ins and registrations associated with these sessions will also be affected.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete {selectedIds.size} Session{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
