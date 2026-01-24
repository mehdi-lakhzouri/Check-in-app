'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import {
  ClipboardList,
  CalendarPlus,
  UserPlus,
  Building2,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subWeeks, subMonths } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableSkeleton, type DataTableColumn } from '@/components/ui/data-table';
import { BulkRegistrationDialog } from '@/components/bulk-registration-dialog';
import { toast } from 'sonner';

// Common components
import {
  PageHeader,
  StatsGrid,
  StatCard,
  DeleteConfirmDialog,
} from '@/components/common';

import { RegistrationsFilterBar } from './registrations-filter-bar';

// Module types
import type { PopulatedRegistration, DateRangePreset } from '@/components/registrations/types';

// Hooks
import {
  useRegistrations,
  useRegistrationStats,
  useCreateRegistration,
  useDeleteRegistration,
  useParticipants,
  useSessions,
} from '@/lib/hooks';

// =============================================================================
// Main Component
// =============================================================================

export function RegistrationsContent() {
  // Dialog states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // TanStack Query hooks
  const {
    data: registrations = [],
    isLoading: registrationsLoading,
    isError: registrationsError,
    refetch: refetchRegistrations,
  } = useRegistrations();

  const { data: stats, isLoading: isStatsLoading } = useRegistrationStats();
  const { data: participants = [], isLoading: participantsLoading } = useParticipants();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();

  const createMutation = useCreateRegistration({});
  const deleteMutation = useDeleteRegistration({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setRegistrationToDelete(null);
    },
  });

  const isLoading = registrationsLoading || participantsLoading || sessionsLoading;
  const populatedRegistrations = registrations as PopulatedRegistration[];

  // Get unique organizations
  const organizations = useMemo(() => {
    const orgs = new Set<string>();
    participants.forEach((p) => {
      if (p.organization?.trim()) {
        orgs.add(p.organization.trim());
      }
    });
    return Array.from(orgs).sort();
  }, [participants]);

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateRangePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subWeeks(now, 1)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subMonths(now, 1)), end: endOfDay(now) };
      default:
        return { start: null, end: null };
    }
  }, [dateRangePreset]);

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    return populatedRegistrations.filter((registration) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const participantName = registration.participantId?.name?.toLowerCase() ?? '';
        const participantEmail = registration.participantId?.email?.toLowerCase() ?? '';
        const sessionName = registration.sessionId?.name?.toLowerCase() ?? '';
        const participantOrg = registration.participantId?.organization?.toLowerCase() ?? '';

        if (
          !participantName.includes(query) &&
          !participantEmail.includes(query) &&
          !sessionName.includes(query) &&
          !participantOrg.includes(query)
        ) {
          return false;
        }
      }

      // Session filter
      if (sessionFilter !== 'all') {
        const sessionId = registration.sessionId?._id ?? registration.sessionId;
        if (sessionId !== sessionFilter) return false;
      }

      // Organization filter
      if (organizationFilter !== 'all') {
        const participantOrg = registration.participantId?.organization?.trim() ?? '';
        if (participantOrg !== organizationFilter) return false;
      }

      // Date range filter
      if (dateRange.start && dateRange.end) {
        const createdAtDate = new Date(registration.createdAt);
        if (!isWithinInterval(createdAtDate, { start: dateRange.start, end: dateRange.end })) {
          return false;
        }
      }

      return true;
    });
  }, [populatedRegistrations, searchQuery, sessionFilter, organizationFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const paginatedRegistrations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRegistrations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRegistrations, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, sessionFilter, organizationFilter, dateRangePreset]);

  // Handlers
  const handleBulkSubmit = useCallback(
    async (sessionId: string, participantIds: string[]) => {
      setIsSubmitting(true);
      let successCount = 0;
      let errorCount = 0;

      try {
        for (const participantId of participantIds) {
          try {
            await createMutation.mutateAsync({ sessionId, participantId, status: 'confirmed' });
            successCount++;
          } catch {
            errorCount++;
          }
        }

        if (successCount > 0) {
          const message = `Successfully registered ${successCount} participant${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`;
          if (errorCount > 0) {
            toast.warning('Registrations Created', { description: message });
          } else {
            toast.success('Registrations Created', { description: message });
          }
        }

        if (errorCount === 0) {
          setIsBulkDialogOpen(false);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [createMutation]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      let successCount = 0;
      let errorCount = 0;

      for (const id of ids) {
        try {
          await deleteMutation.mutateAsync(id);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        const message = `Successfully deleted ${successCount} registration${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`;
        if (errorCount > 0) {
          toast.warning('Registrations Deleted', { description: message });
        } else {
          toast.success('Registrations Deleted', { description: message });
        }
      }

      setSelectedIds(new Set());
    },
    [deleteMutation]
  );

  const handleSingleDelete = useCallback((id: string) => {
    setRegistrationToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmSingleDelete = useCallback(() => {
    if (registrationToDelete) {
      deleteMutation.mutate(registrationToDelete);
    }
  }, [registrationToDelete, deleteMutation]);

  // Table columns
  const columns: DataTableColumn<PopulatedRegistration>[] = useMemo(
    () => [
      {
        id: 'participant',
        header: 'Participant',
        cell: (row) => (
          <div className="min-w-[180px]">
            <p className="font-medium truncate">{row.participantId?.name ?? 'Unknown'}</p>
            <p className="text-sm text-muted-foreground truncate">{row.participantId?.email ?? ''}</p>
          </div>
        ),
      },
      {
        id: 'organization',
        header: 'Organization',
        cell: (row) => (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-muted-foreground">
              {row.participantId?.organization || '—'}
            </span>
          </div>
        ),
      },
      {
        id: 'session',
        header: 'Session',
        cell: (row) => (
          <div className="min-w-[150px]">
            <Badge variant="secondary" className="font-normal truncate max-w-[200px]">
              {row.sessionId?.name ?? 'Unknown'}
            </Badge>
          </div>
        ),
      },
      {
        id: 'registeredAt',
        header: 'Registered At',
        align: 'center',
        cell: (row) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {format(new Date(row.createdAt), 'MMM d, yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'center',
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleSingleDelete(row._id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleSingleDelete]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={ClipboardList}
          title="Registrations"
          description="Loading registrations..."
        />
        <StatsGrid columns={{ default: 1, sm: 2 }}>
          <StatCard title="" value="" isLoading />
          <StatCard title="" value="" isLoading />
        </StatsGrid>
        <Card>
          <CardContent className="pt-6">
            <DataTableSkeleton columns={5} rows={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (registrationsError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={ClipboardList}
          title="Registrations"
          description="Manage session registrations"
        />
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load registrations</p>
          <Button onClick={() => refetchRegistrations()}>Retry</Button>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    sessionFilter !== 'all' ||
    organizationFilter !== 'all' ||
    dateRangePreset !== 'all' ||
    searchQuery !== '';

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <PageHeader
        icon={ClipboardList}
        title="Registrations"
        description="Manage session registrations"
        rightContent={
          <Button onClick={() => setIsBulkDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Registrations
          </Button>
        }
      />

      {/* Stats Cards */}
      <StatsGrid columns={{ default: 1, sm: 2 }}>
        <StatCard
          title="Total Registrations"
          value={isStatsLoading ? '...' : (stats?.total ?? populatedRegistrations.length)}
          description="All time"
          icon={ClipboardList}
          variant="primary"
        />
        <StatCard
          title="Today's Registrations"
          value={isStatsLoading ? '...' : (stats?.todayRegistrations ?? 0)}
          description="Registered today"
          icon={CalendarPlus}
          variant="success"
        />
      </StatsGrid>

      {/* Search & Filters */}
      <motion.div variants={cardVariants}>
        <RegistrationsFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          sessionFilter={sessionFilter}
          setSessionFilter={setSessionFilter}
          organizationFilter={organizationFilter}
          setOrganizationFilter={setOrganizationFilter}
          dateRangePreset={dateRangePreset}
          setDateRangePreset={setDateRangePreset}
          sessions={sessions}
          organizations={organizations}
        />
      </motion.div>

      {/* Registrations Table */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Registrations</CardTitle>
                <CardDescription>
                  {hasActiveFilters
                    ? `${filteredRegistrations.length} of ${populatedRegistrations.length} shown`
                    : `${populatedRegistrations.length} total`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable<PopulatedRegistration>
              data={paginatedRegistrations}
              columns={columns}
              getRowId={(row) => row._id}
              selectable={true}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              bulkDeleteEnabled={true}
              onBulkDelete={handleBulkDelete}
              isLoading={false}
              emptyMessage="No registrations found"
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredRegistrations.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Registration Dialog */}
      <BulkRegistrationDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        sessions={sessions}
        participants={participants}
        existingRegistrations={registrations}
        onSubmit={handleBulkSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Single Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Registration"
        description="Are you sure you want to delete this registration? This action cannot be undone."
        onConfirm={confirmSingleDelete}
        isDeleting={deleteMutation.isPending}
        deleteLabel="Delete"
      />
    </motion.div>
  );
}

export default RegistrationsContent;
