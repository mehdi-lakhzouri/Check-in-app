'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, cardVariants, tableRowVariants, pageTransition, TIMING, EASING } from '@/lib/animations';

// Aliases for backwards compatibility
const containerVariants = staggerContainer;
const itemVariants = cardVariants;
import {
  Award,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  UserPlus,
  UserMinus,
  TrendingUp,
  Users,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  CheckCircle2,
  Clock,
  X,
  Wifi,
  WifiOff,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { StatsCard } from '@/components/stats-card';
import { ErrorState } from '@/components/ui/error-state';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAmbassadorRealtime, type AmbassadorPointsUpdate } from '@/lib/hooks';
import type { Participant, ApiResponse } from '@/lib/schemas';

// ============================================================================
// Types
// ============================================================================

interface AmbassadorSearchResult {
  data: Participant[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface AmbassadorDetails {
  ambassador: Participant;
  referredParticipants: Array<{
    _id: string;
    name: string;
    email: string;
    organization?: string;
    status: string;
    isActive: boolean;
  }>;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    points: number;
  };
}

// Animation variants imported from @/lib/animations
// Using: staggerContainer, cardVariants, tableRowVariants, pageTransition

// ============================================================================
// API Functions
// ============================================================================

const ambassadorApi = {
  search: async (params: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<AmbassadorSearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set('search', params.search);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const res = await api.get<ApiResponse<Participant[]> & { meta: AmbassadorSearchResult['meta'] }>(
      `/participants/ambassadors/search?${queryParams.toString()}`
    );
    return { data: res.data, meta: res.meta };
  },
  
  getDetails: async (id: string): Promise<AmbassadorDetails> => {
    const res = await api.get<ApiResponse<AmbassadorDetails>>(
      `/participants/${id}/ambassador/details`
    );
    return res.data;
  },
  
  promote: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/promote`
    );
    return res.data;
  },
  
  demote: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/demote`
    );
    return res.data;
  },
  
  addReferral: async (ambassadorId: string, participantId: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${ambassadorId}/ambassador/add-referred`,
      { participantId }
    );
    return res.data;
  },
  
  removeReferral: async (ambassadorId: string, participantId: string): Promise<Participant> => {
    const res = await api.delete<ApiResponse<Participant>>(
      `/participants/${ambassadorId}/ambassador/remove-referred/${participantId}`
    );
    return res.data;
  },
  
  calculatePoints: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/calculate-points`
    );
    return res.data;
  },
  
  syncReferrals: async (id: string): Promise<{ ambassador: Participant; addedCount: number; totalReferrals: number }> => {
    const res = await api.post<ApiResponse<{ ambassador: Participant; addedCount: number; totalReferrals: number }>>(
      `/participants/${id}/ambassador/sync-referrals`
    );
    return res.data;
  },
  
  syncAllReferrals: async (): Promise<{ processed: number; totalAdded: number }> => {
    const res = await api.post<ApiResponse<{ processed: number; totalAdded: number }>>(
      `/participants/ambassadors/sync-all-referrals`
    );
    return res.data;
  },
  
  getLeaderboard: async (limit = 10): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>(
      `/participants/ambassadors/leaderboard?limit=${limit}`
    );
    return res.data;
  },
  
  searchParticipants: async (search: string): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>(
      `/participants?search=${encodeURIComponent(search)}&limit=20`
    );
    return res.data;
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function AmbassadorsContent() {
  const queryClient = useQueryClient();
  
  // State
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('ambassadorPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [selectedAmbassador, setSelectedAmbassador] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddReferralOpen, setIsAddReferralOpen] = useState(false);
  const [isDemoteDialogOpen, setIsDemoteDialogOpen] = useState(false);
  const [ambassadorToDemote, setAmbassadorToDemote] = useState<Participant | null>(null);
  const [referralSearch, setReferralSearch] = useState('');
  const [isRemoveReferralDialogOpen, setIsRemoveReferralDialogOpen] = useState(false);
  const [referralToRemove, setReferralToRemove] = useState<{ _id: string; name: string } | null>(null);
  
  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDemoteDialogOpen, setIsBulkDemoteDialogOpen] = useState(false);
  const [isBulkDemoting, setIsBulkDemoting] = useState(false);
  
  // Realtime updates
  const handlePointsUpdate = useCallback((data: AmbassadorPointsUpdate) => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', data.ambassadorId] });
    
    // Show toast notification
    const changeText = data.change > 0 ? `+${data.change}` : data.change;
    toast.info(`${data.name} points updated: ${changeText} (now ${data.newPoints})`);
  }, [queryClient]);

  const { isConnected } = useAmbassadorRealtime({
    onPointsUpdate: handlePointsUpdate,
  });
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries
  const { data: ambassadors, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ambassadors', 'search', debouncedSearch, sortBy, sortOrder, page, limit],
    queryFn: () => ambassadorApi.search({
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

  const { data: ambassadorDetails, isLoading: isLoadingDetails, refetch: refetchDetails } = useQuery({
    queryKey: ['ambassador', 'details', selectedAmbassador],
    queryFn: () => ambassadorApi.getDetails(selectedAmbassador!),
    enabled: !!selectedAmbassador && isDetailOpen,
    staleTime: 0, // Always refetch when sheet opens
    gcTime: 0, // Don't cache old data
  });

  const { data: searchResults } = useQuery({
    queryKey: ['participants', 'search', referralSearch],
    queryFn: () => ambassadorApi.searchParticipants(referralSearch),
    enabled: referralSearch.length >= 2,
  });

  // Mutations
  const demoteMutation = useMutation({
    mutationFn: (id: string) => ambassadorApi.demote(id),
    onSuccess: () => {
      toast.success('Ambassador demoted successfully');
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      queryClient.invalidateQueries({ queryKey: ['ambassador', 'details'] });
      setIsDemoteDialogOpen(false);
      setAmbassadorToDemote(null);
      setIsDetailOpen(false);
      setSelectedAmbassador(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to demote ambassador');
    },
  });

  const addReferralMutation = useMutation({
    mutationFn: ({ ambassadorId, participantId }: { ambassadorId: string; participantId: string }) =>
      ambassadorApi.addReferral(ambassadorId, participantId),
    onSuccess: async () => {
      toast.success('Referral added successfully');
      // Refetch the details to get updated data
      await queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', selectedAmbassador] });
      await queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      setIsAddReferralOpen(false);
      setReferralSearch('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add referral');
    },
  });

  const removeReferralMutation = useMutation({
    mutationFn: ({ ambassadorId, participantId }: { ambassadorId: string; participantId: string }) =>
      ambassadorApi.removeReferral(ambassadorId, participantId),
    onSuccess: async () => {
      toast.success('Referral removed successfully');
      setIsRemoveReferralDialogOpen(false);
      setReferralToRemove(null);
      // Refetch fresh data from server
      await queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', selectedAmbassador] });
      await queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove referral');
      setIsRemoveReferralDialogOpen(false);
      setReferralToRemove(null);
    },
  });

  const calculatePointsMutation = useMutation({
    mutationFn: (id: string) => ambassadorApi.calculatePoints(id),
    onSuccess: async () => {
      toast.success('Points recalculated successfully');
      await queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      await queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', selectedAmbassador] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to calculate points');
    },
  });

  const syncReferralsMutation = useMutation({
    mutationFn: (id: string) => ambassadorApi.syncReferrals(id),
    onSuccess: async (data) => {
      toast.success(`Synced referrals: added ${data.addedCount} new, total ${data.totalReferrals}`);
      await queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      await queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', selectedAmbassador] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync referrals');
    },
  });

  const syncAllReferralsMutation = useMutation({
    mutationFn: () => ambassadorApi.syncAllReferrals(),
    onSuccess: async (data) => {
      toast.success(`Synced all: processed ${data.processed} ambassadors, added ${data.totalAdded} referrals`);
      await queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      await queryClient.invalidateQueries({ queryKey: ['ambassador', 'details'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync all referrals');
    },
  });

  // Handlers
  const handleViewDetails = (ambassador: Participant) => {
    setSelectedAmbassador(ambassador._id);
    setIsDetailOpen(true);
    // Invalidate any cached details to force fresh fetch
    queryClient.invalidateQueries({ queryKey: ['ambassador', 'details', ambassador._id] });
  };

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && ambassadors?.data) {
      const newSelected = new Set<string>();
      ambassadors.data.forEach(a => newSelected.add(a._id));
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(new Set());
    }
  }, [ambassadors?.data]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const allSelected = useMemo(() => {
    return ambassadors?.data && ambassadors.data.length > 0 && ambassadors.data.every(a => selectedIds.has(a._id));
  }, [ambassadors?.data, selectedIds]);

  const someSelected = useMemo(() => {
    return ambassadors?.data && ambassadors.data.some(a => selectedIds.has(a._id)) && !allSelected;
  }, [ambassadors?.data, selectedIds, allSelected]);

  const handleBulkDemote = async () => {
    setIsBulkDemoting(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        await demoteMutation.mutateAsync(id);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsBulkDemoting(false);
    setIsBulkDemoteDialogOpen(false);
    setSelectedIds(new Set());

    if (successCount > 0) {
      toast.success(`Demoted ${successCount} ambassador${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`);
    }
  };

  const handleDemote = (ambassador: Participant) => {
    setAmbassadorToDemote(ambassador);
    setIsDemoteDialogOpen(true);
  };

  const handleAddReferral = (participantId: string) => {
    if (selectedAmbassador) {
      addReferralMutation.mutate({ ambassadorId: selectedAmbassador, participantId });
    }
  };

  const handleRemoveReferral = (referral: { _id: string; name: string }) => {
    setReferralToRemove(referral);
    setIsRemoveReferralDialogOpen(true);
  };

  const confirmRemoveReferral = () => {
    if (selectedAmbassador && referralToRemove) {
      removeReferralMutation.mutate({ ambassadorId: selectedAmbassador, participantId: referralToRemove._id });
    }
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['ambassadors', 'leaderboard'] });
  };

  const totalAmbassadors = ambassadors?.meta.total ?? 0;
  const totalPoints = ambassadors?.data.reduce((sum, a) => sum + a.ambassadorPoints, 0) ?? 0;
  const avgPoints = totalAmbassadors > 0 ? Math.round(totalPoints / totalAmbassadors) : 0;

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ambassadors</h2>
          <p className="text-muted-foreground">Manage ambassador program and referrals</p>
        </div>
        <ErrorState
          error={error as Error}
          onRetry={handleRefresh}
          title="Failed to load ambassadors"
          description="Unable to fetch ambassador data from the server."
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ambassadors</h2>
          <p className="text-muted-foreground">Manage ambassador program and referrals</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncAllReferralsMutation.mutate()}
            disabled={syncAllReferralsMutation.isPending}
          >
            <Users className={`mr-2 h-4 w-4 ${syncAllReferralsMutation.isPending ? 'animate-spin' : ''}`} />
            {syncAllReferralsMutation.isPending ? 'Syncing...' : 'Sync All Orgs'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Total Ambassadors"
            value={totalAmbassadors}
            description="Active program members"
            icon={Award}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Total Points"
            value={totalPoints}
            description="Combined referral points"
            icon={TrendingUp}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Average Points"
            value={avgPoints}
            description="Per ambassador"
            icon={Trophy}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Top Score"
            value={leaderboard?.[0]?.ambassadorPoints ?? 0}
            description={leaderboard?.[0]?.name ?? 'N/A'}
            icon={Users}
          />
        </motion.div>
      </motion.div>

      {/* Leaderboard Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Ambassadors
            </CardTitle>
            <CardDescription>Leading performers in the referral program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard?.slice(0, 5).map((ambassador, index) => (
                <div key={ambassador._id} className="flex items-center gap-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ambassador.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{ambassador.organization}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{ambassador.ambassadorPoints}</p>
                    <p className="text-xs text-muted-foreground">
                      {ambassador.referredParticipantIds.length} referrals
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Ambassadors</CardTitle>
                <CardDescription>Search, filter, and manage ambassador accounts</CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDemoteDialogOpen(true)}
                  className="gap-2"
                >
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                  Demote ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search by name, email, or organization..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Search ambassadors"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambassadorPoints">Points</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Date Joined</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Page Size Selector - Before Table */}
            {ambassadors && ambassadors.meta.total > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <label htmlFor="ambassadors-page-size" className="sr-only">Items per page</label>
                <span aria-hidden="true">Show</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(parseInt(value));
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                >
                  <SelectTrigger id="ambassadors-page-size" className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 25, 50, 100].map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span aria-hidden="true">entries per page</span>
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <Table role="table" aria-label="Ambassadors list">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center" scope="col">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected || false;
                          }
                        }}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all ambassadors"
                      />
                    </TableHead>
                    <TableHead className="text-center" scope="col">Ambassador</TableHead>
                    <TableHead className="text-center" scope="col">Organization</TableHead>
                    <TableHead className="text-center" scope="col">Points</TableHead>
                    <TableHead className="text-center" scope="col">Referrals</TableHead>
                    <TableHead className="text-center" scope="col">Status</TableHead>
                    <TableHead className="text-center" scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : ambassadors?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No ambassadors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ambassadors?.data.map((ambassador) => {
                      const isSelected = selectedIds.has(ambassador._id);
                      return (
                        <TableRow 
                          key={ambassador._id}
                          className={isSelected ? 'bg-primary/5' : undefined}
                          data-state={isSelected ? 'selected' : undefined}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectOne(ambassador._id, !!checked)}
                              aria-label={`Select ${ambassador.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <p className="font-medium">{ambassador.name}</p>
                              <p className="text-sm text-muted-foreground">{ambassador.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{ambassador.organization || '—'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              {ambassador.ambassadorPoints}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {ambassador.referredParticipantIds.length}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={ambassador.isActive ? 'default' : 'secondary'}>
                              {ambassador.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={`Actions for ${ambassador.name}`}>
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleViewDetails(ambassador)}>
                                  <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => calculatePointsMutation.mutate(ambassador._id)}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Recalculate Points
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDemote(ambassador)}
                                  className="text-destructive"
                                >
                                  <UserMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Demote
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls - Bottom Right */}
            {ambassadors && ambassadors.meta.total > 0 && (
              <nav 
                className="flex items-center justify-end gap-2 pt-4"
                aria-label="Ambassadors table pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={!ambassadors.meta.hasPrevPage}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Previous
                </Button>
                <span className="text-sm min-w-[100px] text-center" aria-live="polite">
                  Page {page} of {ambassadors.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!ambassadors.meta.hasNextPage}
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </nav>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Ambassador Detail Sheet - Enhanced Accessible Design */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent 
          className="w-full sm:max-w-xl overflow-y-auto p-0"
          aria-labelledby="ambassador-sheet-title"
          aria-describedby="ambassador-sheet-description"
        >
          {isLoadingDetails ? (
            <div className="p-6 space-y-6" role="status" aria-label="Loading ambassador details">
              {/* Header Skeleton */}
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              {/* Stats Skeleton */}
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              {/* Content Skeleton */}
              <Skeleton className="h-48 w-full rounded-xl" />
              <span className="sr-only">Loading ambassador details, please wait...</span>
            </div>
          ) : ambassadorDetails ? (
            <div className="flex flex-col h-full">
              {/* Gradient Header */}
              <header className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 p-6 pb-16">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative z-10">
                  <SheetHeader className="text-white">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <SheetTitle 
                          id="ambassador-sheet-title"
                          className="text-2xl font-bold text-white flex items-center gap-2"
                        >
                          <Award className="h-6 w-6" aria-hidden="true" />
                          Ambassador Profile
                        </SheetTitle>
                        <SheetDescription 
                          id="ambassador-sheet-description"
                          className="text-white/80"
                        >
                          Manage referrals and track performance
                        </SheetDescription>
                      </div>
                      <Badge 
                        variant={ambassadorDetails.ambassador.isActive ? 'default' : 'secondary'}
                        className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
                      >
                        {ambassadorDetails.ambassador.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </SheetHeader>
                </div>
                {/* Decorative pattern */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-background rounded-t-3xl" />
              </header>

              {/* Profile Card - Floating over header */}
              <div className="px-6 -mt-12 relative z-20">
                <Card className="shadow-lg border-0 bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar with initial */}
                      <div 
                        className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-md"
                        aria-hidden="true"
                      >
                        {ambassadorDetails.ambassador.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl truncate">
                          {ambassadorDetails.ambassador.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {ambassadorDetails.ambassador.email}
                        </p>
                        {ambassadorDetails.ambassador.organization && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            <span className="truncate">{ambassadorDetails.ambassador.organization}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Section */}
              <section 
                className="px-6 py-4"
                aria-labelledby="ambassador-stats-heading"
              >
                <h4 id="ambassador-stats-heading" className="sr-only">Performance Statistics</h4>
                <div className="grid grid-cols-3 gap-3" role="list" aria-label="Ambassador statistics">
                  <div 
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20"
                    role="listitem"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 h-16 w-16 rounded-full bg-primary/10" aria-hidden="true" />
                    <Trophy className="h-5 w-5 text-primary mb-2" aria-hidden="true" />
                    <p 
                      className="text-3xl font-bold text-primary"
                      aria-label={`${ambassadorDetails.stats.points} points`}
                    >
                      {ambassadorDetails.stats.points}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Total Points</p>
                  </div>
                  <div 
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 border border-green-500/20"
                    role="listitem"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 h-16 w-16 rounded-full bg-green-500/10" aria-hidden="true" />
                    <Users className="h-5 w-5 text-green-600 mb-2" aria-hidden="true" />
                    <p 
                      className="text-3xl font-bold text-green-600"
                      aria-label={`${ambassadorDetails.stats.totalReferrals} total referrals`}
                    >
                      {ambassadorDetails.stats.totalReferrals}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Referrals</p>
                  </div>
                  <div 
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 border border-blue-500/20"
                    role="listitem"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 h-16 w-16 rounded-full bg-blue-500/10" aria-hidden="true" />
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mb-2" aria-hidden="true" />
                    <p 
                      className="text-3xl font-bold text-blue-600"
                      aria-label={`${ambassadorDetails.stats.activeReferrals} active referrals`}
                    >
                      {ambassadorDetails.stats.activeReferrals}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Active</p>
                  </div>
                </div>
              </section>

              {/* Progress Indicator */}
              <section className="px-6 py-2" aria-labelledby="progress-heading">
                <h4 id="progress-heading" className="sr-only">Activation progress</h4>
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Referral Activation Rate</span>
                      <span className="text-sm font-bold text-primary">
                        {ambassadorDetails.stats.totalReferrals > 0 
                          ? Math.round((ambassadorDetails.stats.activeReferrals / ambassadorDetails.stats.totalReferrals) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={ambassadorDetails.stats.totalReferrals > 0 
                        ? (ambassadorDetails.stats.activeReferrals / ambassadorDetails.stats.totalReferrals) * 100
                        : 0} 
                      className="h-2"
                      aria-label={`${ambassadorDetails.stats.activeReferrals} of ${ambassadorDetails.stats.totalReferrals} referrals are active`}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {ambassadorDetails.stats.activeReferrals} of {ambassadorDetails.stats.totalReferrals} referrals are currently active
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Referrals List */}
              <section 
                className="flex-1 px-6 py-4"
                aria-labelledby="referrals-heading"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 id="referrals-heading" className="font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Referred Participants
                    <Badge variant="secondary" className="ml-1">
                      {ambassadorDetails.referredParticipants.length}
                    </Badge>
                  </h4>
                  <Button 
                    size="sm" 
                    onClick={() => setIsAddReferralOpen(true)}
                    aria-label="Add new referral"
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Add Referral
                  </Button>
                </div>
                
                {ambassadorDetails.referredParticipants.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <p className="font-medium text-muted-foreground">No referrals yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click &quot;Add Referral&quot; to start building the network
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div 
                    className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin"
                    role="list"
                    aria-label="List of referred participants"
                  >
                    <AnimatePresence mode="popLayout">
                      {ambassadorDetails.referredParticipants.map((referral, index) => (
                        <motion.div
                          key={referral._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group flex items-center justify-between p-3 border rounded-xl hover:bg-accent/50 transition-colors"
                          role="listitem"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div 
                              className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-semibold"
                              aria-hidden="true"
                            >
                              {referral.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{referral.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{referral.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleRemoveReferral({ _id: referral._id, name: referral.name })}
                            disabled={removeReferralMutation.isPending}
                            aria-label={`Remove ${referral.name} from referrals`}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>

              {/* Footer Actions */}
              <footer className="sticky bottom-0 bg-background border-t p-4 mt-auto">
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => syncReferralsMutation.mutate(selectedAmbassador!)}
                    disabled={syncReferralsMutation.isPending || !ambassadorDetails?.ambassador.organization}
                    aria-busy={syncReferralsMutation.isPending}
                    title={!ambassadorDetails?.ambassador.organization ? 'Ambassador has no organization set' : 'Sync referrals from same organization'}
                  >
                    <Users className={`h-4 w-4 mr-2 ${syncReferralsMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {syncReferralsMutation.isPending ? 'Syncing...' : 'Sync Org'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => calculatePointsMutation.mutate(selectedAmbassador!)}
                    disabled={calculatePointsMutation.isPending}
                    aria-busy={calculatePointsMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${calculatePointsMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {calculatePointsMutation.isPending ? 'Calculating...' : 'Recalc Points'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDemote(ambassadorDetails.ambassador)}
                    aria-label={`Demote ${ambassadorDetails.ambassador.name} from ambassador status`}
                  >
                    <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Demote
                  </Button>
                </div>
              </footer>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Add Referral Dialog - Enhanced */}
      <Dialog open={isAddReferralOpen} onOpenChange={setIsAddReferralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
              Add Referral
            </DialogTitle>
            <DialogDescription>
              Search for a participant to add as a referral to this ambassador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by name or email..."
                value={referralSearch}
                onChange={(e) => setReferralSearch(e.target.value)}
                className="pl-9"
                aria-label="Search participants"
              />
            </div>
            <div 
              className="max-h-72 overflow-y-auto space-y-2 pr-1"
              role="listbox"
              aria-label="Available participants"
            >
              {searchResults?.filter(p => 
                p.status !== 'ambassador' && 
                !ambassadorDetails?.referredParticipants.some(r => r._id === p._id)
              ).map((participant) => (
                <motion.div
                  key={participant._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center justify-between p-3 border rounded-xl hover:bg-accent hover:border-primary/50 cursor-pointer transition-all"
                  onClick={() => handleAddReferral(participant._id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddReferral(participant._id)}
                  role="option"
                  tabIndex={0}
                  aria-label={`Add ${participant.name} as referral`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      aria-hidden="true"
                    >
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{participant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    tabIndex={-1}
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Add
                  </Button>
                </motion.div>
              ))}
              {referralSearch.length >= 2 && searchResults?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="font-medium text-muted-foreground">No participants found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
              {referralSearch.length < 2 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <p className="font-medium">Search for participants</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Type at least 2 characters to start searching
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddReferralOpen(false);
                setReferralSearch('');
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demote Confirmation Dialog - Enhanced */}
      <AlertDialog open={isDemoteDialogOpen} onOpenChange={setIsDemoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
              <AlertDialogTitle>Demote Ambassador</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to demote <strong>{ambassadorToDemote?.name}</strong> from 
                ambassador status?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-2">
                <p className="text-sm text-destructive dark:text-red-400 font-medium">
                  ⚠️ This action will:
                </p>
                <ul className="text-sm text-destructive/80 dark:text-red-300 mt-1 ml-4 list-disc">
                  <li>Remove all referral associations</li>
                  <li>Reset points to 0</li>
                  <li>Change status back to regular participant</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ambassadorToDemote && demoteMutation.mutate(ambassadorToDemote._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
              Demote Ambassador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Referral Confirmation Dialog - Stylish */}
      <AlertDialog open={isRemoveReferralDialogOpen} onOpenChange={setIsRemoveReferralDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="h-16 w-16 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center mb-4 shadow-lg"
              >
                <Trash2 className="h-8 w-8 text-destructive" aria-hidden="true" />
              </motion.div>
              <AlertDialogTitle className="text-xl">Remove Referral</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="mt-3 space-y-3 text-muted-foreground text-sm">
                  <p className="text-base">
                    Are you sure you want to remove{' '}
                    <span className="font-semibold text-foreground">{referralToRemove?.name}</span>{' '}
                    from this ambassador&apos;s referrals?
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-medium">Points will be recalculated</p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                          The ambassador will lose 10 points for this referral. Use &quot;Sync Org&quot; to restore if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:justify-center gap-3">
            <AlertDialogCancel 
              className="flex-1 sm:flex-none"
              onClick={() => {
                setIsRemoveReferralDialogOpen(false);
                setReferralToRemove(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveReferral}
              disabled={removeReferralMutation.isPending}
              className="flex-1 sm:flex-none bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {removeReferralMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove Referral
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Demote Confirmation Dialog */}
      <AlertDialog open={isBulkDemoteDialogOpen} onOpenChange={setIsBulkDemoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Demote Multiple Ambassadors
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to demote{' '}
                  <strong className="text-foreground">{selectedIds.size}</strong>{' '}
                  ambassador{selectedIds.size !== 1 ? 's' : ''}.
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive dark:text-red-400 font-medium">
                    This action will for each ambassador:
                  </p>
                  <ul className="text-sm text-destructive/80 dark:text-red-300 mt-1 ml-4 list-disc">
                    <li>Remove all referral associations</li>
                    <li>Reset points to 0</li>
                    <li>Change status back to regular participant</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDemoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDemote}
              disabled={isBulkDemoting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDemoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Demoting...
                </>
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Demote {selectedIds.size} Ambassador{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
