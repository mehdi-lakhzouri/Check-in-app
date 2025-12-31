'use client';

import { useState, useMemo, useCallback } from 'react';
import { CalendarDays, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

import { useSessions } from '@/lib/hooks/use-sessions';
import type { Session } from '@/lib/schemas';

import {
  BulkCreateWizard,
  SessionFormDialog,
  SessionDetailsDialog,
  SessionsTable,
  SessionsFilterBar,
  type SortField,
  type SortConfig,
  type StatusFilter,
} from './sessions';

export function SessionsContent() {
  // UI State
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'startTime', direction: 'asc' });

  // TanStack Query hooks
  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSessions();

  // Sorting function
  const sortSessions = useCallback((data: Session[], config: SortConfig) => {
    return [...data].sort((a, b) => {
      let aValue: string | number | boolean;
      let bValue: string | number | boolean;
      
      switch (config.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'startTime':
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
          break;
        case 'endTime':
          aValue = new Date(a.endTime).getTime();
          bValue = new Date(b.endTime).getTime();
          break;
        case 'isOpen':
          aValue = a.isOpen ? 1 : 0;
          bValue = b.isOpen ? 1 : 0;
          break;
        case 'checkInsCount':
          aValue = a.checkInsCount || 0;
          bValue = b.checkInsCount || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

  // Processed sessions (filtered + sorted)
  const processedSessions = useMemo(() => {
    let filtered = sessions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.location?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => 
        statusFilter === 'open' ? s.isOpen : !s.isOpen
      );
    }

    // Apply sorting
    return sortSessions(filtered, sortConfig);
  }, [sessions, searchQuery, statusFilter, sortConfig, sortSessions]);

  // Handle sort
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle view details
  const handleViewDetails = (session: Session) => {
    setSelectedSession(session);
    setIsDetailDialogOpen(true);
  };

  // Handle edit
  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setIsFormDialogOpen(true);
  };

  // Handle form dialog close
  const handleFormDialogClose = (open: boolean) => {
    setIsFormDialogOpen(open);
    if (!open) {
      setEditingSession(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              Sessions
            </h2>
            <p className="text-muted-foreground">Loading sessions...</p>
          </div>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        onRetry={() => refetch()}
        title="Failed to load sessions"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            Sessions
          </h2>
          <p className="text-muted-foreground">
            Manage conference sessions
            {processedSessions.length !== sessions.length && (
              <Badge variant="secondary" className="ml-2">
                {processedSessions.length} of {sessions.length} shown
              </Badge>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <BulkCreateWizard />
          
          <SessionFormDialog
            session={editingSession}
            open={isFormDialogOpen}
            onOpenChange={handleFormDialogClose}
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Session
              </Button>
            }
          />
        </div>
      </div>

      {/* Search and Filter Bar */}
      <SessionsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Sessions Table */}
      <SessionsTable
        sessions={processedSessions}
        totalSessions={sessions.length}
        sortConfig={sortConfig}
        onSort={handleSort}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
      />

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        session={selectedSession}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onEdit={handleEdit}
      />
    </div>
  );
}
