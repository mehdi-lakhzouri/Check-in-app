'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import { CalendarDays, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';

// Common components
import { PageHeader } from '@/components/common';

// Module components
import {
  BulkSessionsDialog,
  SessionFormDialog,
  SessionDetailsDialog,
  SessionsTable,
  SessionsFilterBar,
  type SortField,
  type SortConfig,
  type StatusFilter,
  type TimeFilter,
  type CapacityFilter,
} from '@/components/sessions';

// Hooks
import { useSessions, useSessionStatusRealtime } from '@/lib/hooks';
import type { Session } from '@/lib/schemas';

// =============================================================================
// Main Component
// =============================================================================

export function SessionsContent() {
  // UI State
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'startTime',
    direction: 'asc',
  });

  // TanStack Query hooks
  const {
    data: sessions = [],
    isLoading,
    isError,
    refetch,
  } = useSessions();

  // Real-time session status updates
  const { isConnected: isRealtimeConnected } = useSessionStatusRealtime({
    enabled: true,
    onStatusChange: (update) => {
      const statusMessages: Record<string, string> = {
        open: `🟢 "${update.sessionName}" is now open for check-ins`,
        ended: `🔴 "${update.sessionName}" has ended`,
        closed: `⛔ "${update.sessionName}" has been closed`,
        scheduled: `📅 "${update.sessionName}" status updated`,
        cancelled: `❌ "${update.sessionName}" has been cancelled`,
      };
      const reasonSuffix =
        update.reason === 'auto_open' ? ' (auto)' : update.reason === 'auto_end' ? ' (auto)' : '';
      toast.info(statusMessages[update.newStatus] + reasonSuffix);
    },
  });

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

  // Get unique locations for filter dropdown
  const locations = useMemo(() => {
    const locs = sessions
      .map((s) => s.location)
      .filter((loc): loc is string => !!loc && loc.trim() !== '');
    return [...new Set(locs)].sort();
  }, [sessions]);

  // Processed sessions (filtered + sorted)
  const processedSessions = useMemo(() => {
    let filtered = sessions;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
      filtered = filtered.filter((s) => (statusFilter === 'open' ? s.isOpen : !s.isOpen));
    }

    // Apply time filter
    if (timeFilter !== 'all') {
      filtered = filtered.filter((s) => {
        const sessionStart = new Date(s.startTime);
        const sessionEnd = new Date(s.endTime);
        switch (timeFilter) {
          case 'today':
            return sessionStart <= endOfToday && sessionEnd >= startOfToday;
          case 'upcoming':
            return sessionStart > now;
          case 'past':
            return sessionEnd < now;
          case 'thisWeek':
            return sessionStart <= endOfWeek && sessionEnd >= startOfWeek;
          case 'thisMonth':
            return sessionStart <= endOfMonth && sessionEnd >= startOfMonth;
          default:
            return true;
        }
      });
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter((s) => s.location === locationFilter);
    }

    // Apply capacity filter
    if (capacityFilter !== 'all') {
      filtered = filtered.filter((s) => {
        const checkIns = s.checkInsCount || 0;
        const capacity = s.capacity;
        switch (capacityFilter) {
          case 'available':
            return capacity && checkIns < capacity;
          case 'full':
            return capacity && checkIns >= capacity;
          case 'noLimit':
            return !capacity;
          default:
            return true;
        }
      });
    }

    return sortSessions(filtered, sortConfig);
  }, [
    sessions,
    searchQuery,
    statusFilter,
    timeFilter,
    locationFilter,
    capacityFilter,
    sortConfig,
    sortSessions,
  ]);

  // Handle sort
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={CalendarDays}
          title="Sessions"
          description="Loading sessions..."
        />
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={CalendarDays}
          title="Sessions"
          description="Manage conference sessions"
        />
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load sessions</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <PageHeader
        icon={CalendarDays}
        title="Sessions"
        description={
          processedSessions.length !== sessions.length
            ? `${processedSessions.length} of ${sessions.length} shown`
            : `Manage conference sessions (${sessions.length} total)`
        }
        connectionStatus={{ isConnected: isRealtimeConnected }}
        rightContent={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsBulkDialogOpen(true)}>
              <Upload className="h-4 w-4" />
              Bulk Add
            </Button>

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
        }
      />

      {/* Search and Filter Bar */}
      <motion.div variants={cardVariants}>
        <SessionsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          capacityFilter={capacityFilter}
          onCapacityFilterChange={setCapacityFilter}
          locationFilter={locationFilter}
          onLocationFilterChange={setLocationFilter}
          locations={locations}
        />
      </motion.div>

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

      {/* Bulk Sessions Dialog */}
      <BulkSessionsDialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen} />
    </motion.div>
  );
}

export default SessionsContent;
