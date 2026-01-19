'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  ClipboardList,
  CalendarPlus,
  UserPlus,
  Building2,
  Calendar,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import { format, isWithinInterval, startOfDay, endOfDay, subWeeks, subMonths } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, DataTableSkeleton, type DataTableColumn } from '@/components/ui/data-table';
import { StatsCard } from '@/components/stats-card';
import { BulkRegistrationDialog } from '@/components/bulk-registration-dialog';
import { toast } from 'sonner';
import {
  useRegistrations,
  useRegistrationStats,
  useCreateRegistration,
  useDeleteRegistration,
  useParticipants,
  useSessions,
} from '@/lib/hooks';
import type { Registration, Participant, Session } from '@/lib/schemas';

// Types
type DateRangePreset = 'all' | 'today' | 'week' | 'month';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface PopulatedRegistration extends Omit<Registration, 'participantId' | 'sessionId'> {
  participantId: Participant;
  sessionId: Session;
}

// Animation variants
const containerVariants = staggerContainer;
const itemVariants = cardVariants;

// ============================================================================
// Main Component
// ============================================================================

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
    error: registrationsErr,
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
  const dateRange = useMemo((): DateRange => {
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
        const registeredAt = new Date(registration.registeredAt);
        if (!isWithinInterval(registeredAt, { start: dateRange.start, end: dateRange.end })) {
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

  const hasActiveFilters = sessionFilter !== 'all' || organizationFilter !== 'all' || dateRangePreset !== 'all';
  const activeFilterCount = [sessionFilter, organizationFilter, dateRangePreset].filter((f) => f !== 'all').length;

  // Handlers
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSessionFilter('all');
    setOrganizationFilter('all');
    setDateRangePreset('all');
  }, []);

  const handleBulkSubmit = useCallback(
    async (sessionId: string, participantIds: string[]) => {
      setIsSubmitting(true);
      let successCount = 0;
      let errorCount = 0;

      try {
        for (const participantId of participantIds) {
          try {
            await createMutation.mutateAsync({ sessionId, participantId });
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
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
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
            {format(new Date(row.registeredAt), 'MMM d, yyyy')}
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
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleSingleDelete(row._id)}
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
    [handleSingleDelete]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
            <p className="text-muted-foreground">Loading registrations...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <DataTableSkeleton columns={5} rows={5} showCheckbox />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (registrationsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
            <p className="text-muted-foreground">Manage session registrations</p>
          </div>
        </div>
        <ErrorState
          error={registrationsErr}
          onRetry={() => refetchRegistrations()}
          title="Failed to load registrations"
          description="Unable to fetch registrations from the server."
        />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
            <p className="text-muted-foreground">
              Manage session registrations
              {filteredRegistrations.length !== populatedRegistrations.length && (
                <Badge variant="secondary" className="ml-2">
                  {filteredRegistrations.length} of {populatedRegistrations.length} shown
                </Badge>
              )}
            </p>
          </div>
        </div>

        <Button onClick={() => setIsBulkDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Registrations
        </Button>
      </div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2">
        <StatsCard
          title="Total Registrations"
          value={isStatsLoading ? '...' : stats?.total ?? populatedRegistrations.length}
          description="All time"
          icon={ClipboardList}
        />
        <StatsCard
          title="Today's Registrations"
          value={isStatsLoading ? '...' : stats?.todayRegistrations ?? 0}
          description="Registered today"
          icon={CalendarPlus}
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4">
              {/* Search Row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search by name, email, session, or organization..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                    aria-label="Search registrations"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" aria-hidden="true" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-3 w-3" aria-hidden="true" />
                    Clear filters
                  </Button>
                )}
              </div>

              {/* Filter Options */}
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    {/* Session Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        Session
                      </label>
                      <Select value={sessionFilter} onValueChange={setSessionFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All sessions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sessions</SelectItem>
                          {sessions.map((session) => (
                            <SelectItem key={session._id} value={session._id}>
                              {session.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Organization Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                        Organization
                      </label>
                      <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All organizations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All organizations</SelectItem>
                          {organizations.map((org) => (
                            <SelectItem key={org} value={org}>
                              {org}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                        Date Range
                      </label>
                      <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Last 7 days</SelectItem>
                          <SelectItem value="month">Last 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Registrations Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>All Registrations</CardTitle>
            <CardDescription>A list of all session registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={paginatedRegistrations}
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
                    registration{count !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-destructive font-medium mt-2">
                    This action cannot be undone. The participants will be unregistered from their sessions.
                  </p>
                </>
              )}
              isLoading={false}
              emptyMessage="No registrations found"
              emptyDescription={
                hasActiveFilters || searchQuery
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by adding registrations using the button above'
              }
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredRegistrations.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(perPage) => {
                setItemsPerPage(perPage);
                setCurrentPage(1);
              }}
              stickyHeader={true}
              maxHeight="600px"
              ariaLabel="Registrations table"
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Delete Registration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this registration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSingleDelete}
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
    </motion.div>
  );
}
