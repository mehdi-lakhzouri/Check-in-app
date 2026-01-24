'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import {
  Award,
  RefreshCw,
  MoreVertical,
  Eye,
  UserMinus,
  TrendingUp,
  Users,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableSkeleton, type DataTableColumn } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Common components
import {
  PageHeader,
  DeleteConfirmDialog,
  StatsGrid,
  StatCard,
  ConnectionStatus,
} from '@/components/common';

import { AmbassadorsFilterBar } from './ambassadors-filter-bar';

// Module components and API
import {
  ambassadorApi,
  AmbassadorLeaderboard,
  AmbassadorDetailsSheet,
  AddReferralDialog,
  type AmbassadorDetails,
} from '@/components/ambassadors';

// Hooks
import { useAmbassadorRealtime, type AmbassadorPointsUpdate } from '@/lib/hooks';
import type { Participant } from '@/lib/schemas';

// =============================================================================
// Main Component
// =============================================================================

export function AmbassadorsContent() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('ambassadorPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedAmbassador, setSelectedAmbassador] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddReferralOpen, setIsAddReferralOpen] = useState(false);
  const [isDemoteDialogOpen, setIsDemoteDialogOpen] = useState(false);
  const [ambassadorToDemote, setAmbassadorToDemote] = useState<Participant | null>(null);
  const [referralSearch, setReferralSearch] = useState('');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Realtime updates
  const handlePointsUpdate = useCallback(
    (data: AmbassadorPointsUpdate) => {
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', data.ambassadorId] });
      const changeText = data.change > 0 ? `+${data.change}` : data.change;
      toast.info(`${data.name} points updated: ${changeText} (now ${data.newPoints})`);
    },
    [queryClient]
  );

  const { isConnected } = useAmbassadorRealtime({
    onPointsUpdate: handlePointsUpdate,
  });

  // Queries
  const {
    data: ambassadors,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ambassadors', 'search', debouncedSearch, sortBy, sortOrder, page, limit],
    queryFn: () =>
      ambassadorApi.search({
        search: debouncedSearch,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
    staleTime: 30000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['ambassadors', 'leaderboard'],
    queryFn: () => ambassadorApi.getLeaderboard(5),
    staleTime: 30000,
  });

  const { data: ambassadorDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['ambassador', 'details', selectedAmbassador],
    queryFn: () => ambassadorApi.getDetails(selectedAmbassador!),
    enabled: !!selectedAmbassador,
    staleTime: 30000,
  });

  const { data: referralSearchResults = [] } = useQuery({
    queryKey: ['participants', 'search', referralSearch],
    queryFn: () => ambassadorApi.searchParticipants(referralSearch),
    enabled: referralSearch.length >= 2,
  });

  // Mutations
  const demoteMutation = useMutation({
    mutationFn: ambassadorApi.demote,
    onSuccess: () => {
      toast.success('Ambassador demoted successfully');
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      setIsDemoteDialogOpen(false);
      setAmbassadorToDemote(null);
    },
    onError: () => {
      toast.error('Failed to demote ambassador');
    },
  });

  const syncReferralsMutation = useMutation({
    mutationFn: ambassadorApi.syncReferrals,
    onSuccess: (data) => {
      toast.success(`Synced ${data.addedCount} referrals`);
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
    onError: () => {
      toast.error('Failed to sync referrals');
    },
  });

  const syncAllReferralsMutation = useMutation({
    mutationFn: ambassadorApi.syncAllReferrals,
    onSuccess: (data) => {
      toast.success(`Synced ${data.totalAdded} referrals across ${data.processed} ambassadors`);
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
    onError: () => {
      toast.error('Failed to sync all referrals');
    },
  });

  const calculatePointsMutation = useMutation({
    mutationFn: ambassadorApi.calculatePoints,
    onSuccess: () => {
      toast.success('Points recalculated');
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
    onError: () => {
      toast.error('Failed to calculate points');
    },
  });

  const addReferralMutation = useMutation({
    mutationFn: ({ ambassadorId, participantId }: { ambassadorId: string; participantId: string }) =>
      ambassadorApi.addReferral(ambassadorId, participantId),
    onSuccess: () => {
      toast.success('Referral added');
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', selectedAmbassador] });
      setIsAddReferralOpen(false);
    },
    onError: () => {
      toast.error('Failed to add referral');
    },
  });

  // Computed values
  const totalAmbassadors = ambassadors?.meta?.total ?? 0;
  const totalPoints = useMemo(
    () => ambassadors?.data?.reduce((sum, a) => sum + (a.ambassadorPoints || 0), 0) ?? 0,
    [ambassadors?.data]
  );
  const avgPoints = totalAmbassadors > 0 ? Math.round(totalPoints / totalAmbassadors) : 0;

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['ambassadors', 'leaderboard'] });
  }, [refetch, queryClient]);

  const handleViewDetails = useCallback((ambassador: Participant) => {
    setSelectedAmbassador(ambassador._id);
    setIsDetailOpen(true);
  }, []);

  const handleDemote = useCallback((ambassador: Participant) => {
    setAmbassadorToDemote(ambassador);
    setIsDemoteDialogOpen(true);
  }, []);

  // Table columns
  const columns: DataTableColumn<Participant>[] = useMemo(
    () => [
      {
        id: 'ambassador',
        header: 'Ambassador',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={undefined} alt={row.name} />
              <AvatarFallback>
                {row.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{row.name}</p>
              <p className="text-sm text-muted-foreground truncate">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'organization',
        header: 'Organization',
        cell: (row) => <span className="text-muted-foreground">{row.organization || '—'}</span>,
      },
      {
        id: 'points',
        header: 'Points',
        align: 'center',
        cell: (row) => (
          <Badge variant="secondary" className="font-mono">
            {row.ambassadorPoints}
          </Badge>
        ),
      },
      {
        id: 'referrals',
        header: 'Referrals',
        align: 'center',
        cell: (row) => <span className="font-medium">{row.referredParticipantIds?.length || 0}</span>,
      },
      {
        id: 'status',
        header: 'Status',
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
              <DropdownMenuItem
                onClick={() => syncReferralsMutation.mutate(row._id)}
                disabled={!row.organization || syncReferralsMutation.isPending}
              >
                <Users className="mr-2 h-4 w-4" />
                Sync Referrals
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => calculatePointsMutation.mutate(row._id)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate Points
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDemote(row)}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Demote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [calculatePointsMutation, syncReferralsMutation, handleViewDetails, handleDemote]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Award}
          title="Ambassadors"
          description="Manage ambassador program and referrals"
        />
        <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard key={i} title="" value="" isLoading />
          ))}
        </StatsGrid>
        <DataTableSkeleton columns={6} rows={5} />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Award}
          title="Ambassadors"
          description="Manage ambassador program and referrals"
        />
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load ambassadors</p>
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
        icon={Award}
        title="Ambassadors"
        description="Manage ambassador program and referrals"
        onRefresh={handleRefresh}
        connectionStatus={{ isConnected }}
        rightContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllReferralsMutation.mutate()}
            disabled={syncAllReferralsMutation.isPending}
          >
            <Users className="mr-2 h-4 w-4" />
            {syncAllReferralsMutation.isPending ? 'Syncing...' : 'Sync All Orgs'}
          </Button>
        }
      />

      {/* Stats Cards */}
      <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
        <StatCard
          title="Total Ambassadors"
          value={totalAmbassadors}
          description="Active program members"
          icon={Award}
          variant="primary"
        />
        <StatCard
          title="Total Points"
          value={totalPoints}
          description="Combined referral points"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Average Points"
          value={avgPoints}
          description="Per ambassador"
          icon={Trophy}
          variant="warning"
        />
        <StatCard
          title="Top Score"
          value={leaderboard?.[0]?.ambassadorPoints ?? 0}
          description={leaderboard?.[0]?.name ?? 'N/A'}
          icon={Users}
          variant="info"
        />
      </StatsGrid>

      {/* Leaderboard */}
      <motion.div variants={cardVariants}>
        <AmbassadorLeaderboard
          ambassadors={leaderboard || []}
          onSelect={handleViewDetails}
        />
      </motion.div>

      {/* Search & Table */}
      <motion.div variants={cardVariants} className="space-y-4">
        <AmbassadorsFilterBar
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        <DataTable<Participant>
          data={ambassadors?.data || []}
          columns={columns}
          getRowId={(row) => row._id}
          isLoading={isLoading}
          emptyMessage="No ambassadors found"
          currentPage={page}
          totalPages={ambassadors?.meta?.totalPages || 1}
          itemsPerPage={limit}
          totalItems={ambassadors?.meta?.total || 0}
          onPageChange={setPage}
          onItemsPerPageChange={setLimit}
        />
      </motion.div>

      {/* Ambassador Details Sheet */}
      <AmbassadorDetailsSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        details={ambassadorDetails as AmbassadorDetails | null}
        isLoading={isLoadingDetails}
        onSyncReferrals={() =>
          selectedAmbassador && syncReferralsMutation.mutate(selectedAmbassador)
        }
        isSyncing={syncReferralsMutation.isPending}
        onAddReferral={() => setIsAddReferralOpen(true)}
        onDemote={() => {
          const ambassador = ambassadors?.data?.find((a) => a._id === selectedAmbassador);
          if (ambassador) handleDemote(ambassador);
        }}
      />

      {/* Add Referral Dialog */}
      <AddReferralDialog
        open={isAddReferralOpen}
        onOpenChange={setIsAddReferralOpen}
        ambassadorName={ambassadorDetails?.ambassador?.name || ''}
        onSearch={setReferralSearch}
        searchResults={referralSearchResults}
        isSearching={false}
        onAddReferral={(participantId) =>
          selectedAmbassador &&
          addReferralMutation.mutate({ ambassadorId: selectedAmbassador, participantId })
        }
        isAdding={addReferralMutation.isPending}
        existingReferralIds={ambassadorDetails?.ambassador?.referredParticipantIds || []}
      />

      {/* Demote Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDemoteDialogOpen}
        onOpenChange={setIsDemoteDialogOpen}
        title="Demote Ambassador"
        description={`Are you sure you want to demote ${ambassadorToDemote?.name}? They will lose their ambassador status and points.`}
        onConfirm={() => ambassadorToDemote && demoteMutation.mutate(ambassadorToDemote._id)}
        isDeleting={demoteMutation.isPending}
        deleteLabel="Demote"
      />
    </motion.div>
  );
}

export default AmbassadorsContent;
