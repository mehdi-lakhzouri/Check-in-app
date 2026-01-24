'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import {
  Plane,
  RefreshCw,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { toast } from 'sonner';

// Common components
import {
  PageHeader,
  StatsGrid,
  StatCard,
  DeleteConfirmDialog,
} from '@/components/common';

// Local filter bar
import { TravelGrantsFilterBar } from './travel-grants-filter-bar';

// Module components and API
import {
  travelGrantApi,
  TravelGrantDetailsSheet,
  type TravelGrantStatus,
  type TravelGrantDetails,
} from '@/components/travel-grants';

// Hooks
import { useTravelGrantRealtime, type TravelGrantUpdate } from '@/lib/hooks';
import type { Participant } from '@/lib/schemas';

// =============================================================================
// Helper Functions
// =============================================================================

const getTravelGrantStatus = (participant: Participant): TravelGrantStatus => {
  if (participant.travelGrantApproved === true) return 'approved';
  if (participant.travelGrantApproved === false) return 'rejected';
  return 'pending';
};

const getStatusIcon = (status: TravelGrantStatus) => {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusVariant = (status: TravelGrantStatus): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending':
    default:
      return 'secondary';
  }
};

// =============================================================================
// Main Component
// =============================================================================

export function TravelGrantsContent() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TravelGrantStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedGrantee, setSelectedGrantee] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    participant: Participant | null;
  }>({ open: false, type: 'approve', participant: null });

  // Realtime updates
  const handleStatusUpdate = useCallback(
    (data: TravelGrantUpdate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.travelGrants.detail(data.participantId),
      });

      const statusEmoji =
        data.status === 'approved' ? '✅' : data.status === 'rejected' ? '❌' : '⏳';
      toast.info(`${statusEmoji} ${data.name}'s travel grant: ${data.status}`);
    },
    [queryClient]
  );

  const { isConnected } = useTravelGrantRealtime({
    onStatusUpdate: handleStatusUpdate,
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  const filtersKey = `${debouncedSearch}-${statusFilter}`;
  const prevFiltersKeyRef = React.useRef(filtersKey);
  React.useEffect(() => {
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      if (page !== 1) {
        setTimeout(() => setPage(1), 0);
      }
    }
  }, [filtersKey, page]);

  // Queries
  const {
    data: travelGrants,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.travelGrants.search({
      search: debouncedSearch,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    queryFn: () =>
      travelGrantApi.search({
        search: debouncedSearch,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
    staleTime: 30000,
  });

  const { data: allGrantees } = useQuery({
    queryKey: queryKeys.admin.travelGrants.all(),
    queryFn: () => travelGrantApi.getAll(),
    staleTime: 30000,
  });

  const { data: granteeDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: queryKeys.admin.travelGrants.detail(selectedGrantee!),
    queryFn: () => travelGrantApi.getDetails(selectedGrantee!),
    enabled: !!selectedGrantee && isDetailOpen,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => travelGrantApi.approve(id),
    onSuccess: () => {
      toast.success('Travel grant approved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
      setActionDialog({ open: false, type: 'approve', participant: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve travel grant');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => travelGrantApi.reject(id),
    onSuccess: () => {
      toast.success('Travel grant rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
      setActionDialog({ open: false, type: 'reject', participant: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject travel grant');
    },
  });

  // Handlers
  const handleViewDetails = (grantee: Participant) => {
    setSelectedGrantee(grantee._id);
    setIsDetailOpen(true);
  };

  const handleApprove = (participant: Participant) => {
    setActionDialog({ open: true, type: 'approve', participant });
  };

  const handleReject = (participant: Participant) => {
    setActionDialog({ open: true, type: 'reject', participant });
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
  };

  // Stats
  const pendingCount = useMemo(
    () => allGrantees?.filter((g) => getTravelGrantStatus(g) === 'pending').length ?? 0,
    [allGrantees]
  );
  const approvedCount = useMemo(
    () => allGrantees?.filter((g) => getTravelGrantStatus(g) === 'approved').length ?? 0,
    [allGrantees]
  );
  const rejectedCount = useMemo(
    () => allGrantees?.filter((g) => getTravelGrantStatus(g) === 'rejected').length ?? 0,
    [allGrantees]
  );
  const totalCount = allGrantees?.length ?? 0;

  // Table columns
  const columns: DataTableColumn<Participant>[] = useMemo(
    () => [
      {
        id: 'applicant',
        header: 'Applicant',
        cell: (row) => (
          <div className="min-w-[180px]">
            <p className="font-medium truncate">{row.name}</p>
            <p className="text-sm text-muted-foreground truncate">{row.email}</p>
          </div>
        ),
      },
      {
        id: 'organization',
        header: 'Organization',
        cell: (row) => <span className="text-muted-foreground">{row.organization || '—'}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        cell: (row) => {
          const status = getTravelGrantStatus(row);
          return (
            <Badge variant={getStatusVariant(status)} className="gap-1">
              {getStatusIcon(status)}
              {status}
            </Badge>
          );
        },
      },
      {
        id: 'checkIns',
        header: 'Check-ins',
        align: 'center',
        cell: (row) => <Badge variant="outline">{row.checkInCount ?? 0}</Badge>,
      },
      {
        id: 'participantStatus',
        header: 'Participant Status',
        align: 'center',
        cell: (row) => (
          <Badge variant={row.isActive ? 'default' : 'secondary'}>
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
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
              <DropdownMenuItem onClick={() => handleViewDetails(row)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {getTravelGrantStatus(row) === 'pending' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleApprove(row)}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleReject(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Plane}
          title="Travel Grants"
          description="Manage travel grant applications"
        />
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load travel grants</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </div>
    );
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
        icon={Plane}
        title="Travel Grants"
        description="Review and manage travel grant applications"
        onRefresh={handleRefresh}
        connectionStatus={{ isConnected }}
      />

      {/* Stats Cards */}
      <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
        <StatCard
          title="Total Applications"
          value={totalCount}
          description="Travel grant requests"
          icon={Plane}
          variant="primary"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          description="Awaiting decision"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          description="Grants approved"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          description="Applications rejected"
          icon={XCircle}
          variant="danger"
        />
      </StatsGrid>

      {/* Search & Filters */}
      <motion.div variants={cardVariants}>
        <TravelGrantsFilterBar
          search={search}
          setSearch={setSearch}
          status={statusFilter}
          setStatus={setStatusFilter}
        />
      </motion.div>

      {/* Travel Grants Table */}
      <motion.div variants={cardVariants}>
        <DataTable<Participant>
          data={travelGrants?.data ?? []}
          columns={columns}
          getRowId={(row) => row._id}
          isLoading={isLoading}
          emptyMessage="No travel grant applications found"
          currentPage={page}
          totalPages={travelGrants?.meta?.totalPages ?? 1}
          itemsPerPage={limit}
          totalItems={travelGrants?.meta?.total ?? 0}
          onPageChange={setPage}
          onItemsPerPageChange={setLimit}
        />
      </motion.div>

      {/* Grantee Detail Sheet */}
      <TravelGrantDetailsSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        details={granteeDetails as TravelGrantDetails | null}
        isLoading={isLoadingDetails}
        onApprove={() => {
          if (granteeDetails?.participant) {
            handleApprove(granteeDetails.participant);
          }
        }}
        onReject={() => {
          if (granteeDetails?.participant) {
            handleReject(granteeDetails.participant);
          }
        }}
      />

      {/* Action Confirmation Dialog */}
      <DeleteConfirmDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
        title={actionDialog.type === 'approve' ? 'Approve Travel Grant' : 'Reject Travel Grant'}
        description={`Are you sure you want to ${actionDialog.type} the travel grant for ${actionDialog.participant?.name}?`}
        onConfirm={() => {
          if (actionDialog.participant) {
            if (actionDialog.type === 'approve') {
              approveMutation.mutate(actionDialog.participant._id);
            } else {
              rejectMutation.mutate(actionDialog.participant._id);
            }
          }
        }}
        isDeleting={approveMutation.isPending || rejectMutation.isPending}
        deleteLabel={actionDialog.type === 'approve' ? 'Approve Grant' : 'Reject Application'}
      />
    </motion.div>
  );
}

export default TravelGrantsContent;
