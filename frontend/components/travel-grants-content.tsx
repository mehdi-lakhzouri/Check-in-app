'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, cardVariants, tableRowVariants, pageTransition, TIMING, EASING } from '@/lib/animations';

// Aliases for backwards compatibility
const containerVariants = staggerContainer;
const itemVariants = cardVariants;
import {
  Plane,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileCheck,
  FileX,
  Filter,
  Users,
  AlertCircle,
  TrendingUp,
  Wifi,
  WifiOff,
  Calendar,
  MapPin,
  QrCode,
  History,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/stats-card';
import { ErrorState } from '@/components/ui/error-state';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { toast } from 'sonner';
import { useTravelGrantRealtime, type TravelGrantUpdate } from '@/lib/hooks';
import type { Participant, ApiResponse } from '@/lib/schemas';

// ============================================================================
// Types
// ============================================================================

interface TravelGrantSearchResult {
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

interface CheckInRecord {
  _id: string;
  sessionId: string;
  sessionName: string;
  sessionLocation: string;
  checkInTime: string;
  method: 'qr' | 'manual';
  isLate: boolean;
}

interface TravelGrantDetails {
  participant: Participant;
  checkInProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  lastCheckIns: CheckInRecord[];
  stats: {
    totalCheckIns: number;
    totalRegisteredSessions: number;
    applicationStatus: 'pending' | 'approved' | 'rejected';
    appliedAt?: string;
    decidedAt?: string;
  };
}

type TravelGrantStatus = 'pending' | 'approved' | 'rejected';

// ============================================================================
// Helper Functions
// ============================================================================

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

const getStatusVariant = (status: TravelGrantStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
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

const formatCheckInTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatFullDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Animation variants imported from @/lib/animations
// Using: staggerContainer, cardVariants, tableRowVariants, pageTransition

// ============================================================================
// API Functions
// ============================================================================

const travelGrantApi = {
  search: async (params: {
    search?: string;
    status?: TravelGrantStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<TravelGrantSearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const res = await api.get<ApiResponse<Participant[]> & { meta: TravelGrantSearchResult['meta'] }>(
      `/participants/travel-grants/search?${queryParams.toString()}`
    );
    return { data: res.data, meta: res.meta };
  },
  
  getDetails: async (id: string): Promise<TravelGrantDetails> => {
    const res = await api.get<ApiResponse<TravelGrantDetails>>(
      `/participants/${id}/travel-grant/details`
    );
    return res.data;
  },
  
  approve: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/approve`
    );
    return res.data;
  },
  
  reject: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/reject`
    );
    return res.data;
  },
  
  getAll: async (): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>('/participants/travel-grants');
    return res.data;
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function TravelGrantsContent() {
  const queryClient = useQueryClient();
  
  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TravelGrantStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [selectedGrantee, setSelectedGrantee] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    participant: Participant | null;
  }>({ open: false, type: 'approve', participant: null });

  // Realtime updates
  const handleStatusUpdate = useCallback((data: TravelGrantUpdate) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.detail(data.participantId) });
    
    const statusEmoji = data.status === 'approved' ? '✅' : data.status === 'rejected' ? '❌' : '⏳';
    toast.info(`${statusEmoji} ${data.name}'s travel grant: ${data.status}`);
  }, [queryClient]);

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
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // Queries
  const { data: travelGrants, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.admin.travelGrants.search({
      search: debouncedSearch,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    queryFn: () => travelGrantApi.search({
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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

  // Stats - use computed status from travelGrantApproved
  const pendingCount = useMemo(() => 
    allGrantees?.filter(g => getTravelGrantStatus(g) === 'pending').length ?? 0,
    [allGrantees]
  );
  const approvedCount = useMemo(() => 
    allGrantees?.filter(g => getTravelGrantStatus(g) === 'approved').length ?? 0,
    [allGrantees]
  );
  const rejectedCount = useMemo(() => 
    allGrantees?.filter(g => getTravelGrantStatus(g) === 'rejected').length ?? 0,
    [allGrantees]
  );
  const totalCount = allGrantees?.length ?? 0;

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Travel Grants</h2>
          <p className="text-muted-foreground">Manage travel grant applications</p>
        </div>
        <ErrorState
          error={error as Error}
          onRetry={handleRefresh}
          title="Failed to load travel grants"
          description="Unable to fetch travel grant data from the server."
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
          <h2 className="text-3xl font-bold tracking-tight">Travel Grants</h2>
          <p className="text-muted-foreground">Review and manage travel grant applications</p>
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
            title="Total Applications"
            value={totalCount}
            description="Travel grant requests"
            icon={Plane}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Pending Review"
            value={pendingCount}
            description="Awaiting decision"
            icon={Clock}
            className={pendingCount > 0 ? 'border-yellow-200 dark:border-yellow-800' : ''}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Approved"
            value={approvedCount}
            description="Grants approved"
            icon={CheckCircle2}
            className="border-green-200 dark:border-green-800"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Rejected"
            value={rejectedCount}
            description="Applications rejected"
            icon={XCircle}
            className="border-red-200 dark:border-red-800"
          />
        </motion.div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>All Travel Grant Applications</CardTitle>
            <CardDescription>Search, filter, and manage applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or organization..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(v) => setStatusFilter(v as TravelGrantStatus | 'all')}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Applied</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="travelGrantStatus">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Page Size Selector - Before Table */}
            {travelGrants && travelGrants.meta.total > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <label htmlFor="travel-grants-page-size" className="sr-only">Items per page</label>
                <span aria-hidden="true">Show</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="travel-grants-page-size" className="h-8 w-[70px]">
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
              <Table role="table" aria-label="Travel grant applications list">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center" scope="col">Applicant</TableHead>
                    <TableHead className="text-center" scope="col">Organization</TableHead>
                    <TableHead className="text-center" scope="col">Status</TableHead>
                    <TableHead className="text-center" scope="col">Check-ins</TableHead>
                    <TableHead className="text-center" scope="col">Participant Status</TableHead>
                    <TableHead className="text-center" scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : travelGrants?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No travel grant applications found
                      </TableCell>
                    </TableRow>
                  ) : (
                    travelGrants?.data.map((grantee) => (
                      <TableRow key={grantee._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{grantee.name}</p>
                            <p className="text-sm text-muted-foreground">{grantee.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{grantee.organization || '-'}</TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const status = getTravelGrantStatus(grantee);
                            return (
                              <Badge 
                                variant={getStatusVariant(status)}
                                className="gap-1"
                              >
                                {getStatusIcon(status)}
                                {status}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {grantee.checkInCount ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={grantee.isActive ? 'default' : 'secondary'}>
                            {grantee.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${grantee.name}`}>
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewDetails(grantee)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {getTravelGrantStatus(grantee) === 'pending' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleApprove(grantee)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleReject(grantee)}
                                    className="text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls - Bottom Right */}
            {travelGrants && travelGrants.meta.total > 0 && (
              <nav 
                className="flex items-center justify-end gap-2 pt-4"
                aria-label="Travel grants table pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={!travelGrants.meta.hasPrevPage}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Previous
                </Button>
                <span className="text-sm min-w-[100px] text-center" aria-live="polite">
                  Page {page} of {travelGrants.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!travelGrants.meta.hasNextPage}
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

      {/* Grantee Detail Sheet - Enhanced Accessible Design */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent 
          className="w-full sm:max-w-xl overflow-y-auto p-0"
          aria-labelledby="travel-grant-sheet-title"
          aria-describedby="travel-grant-sheet-description"
        >
          {isLoadingDetails ? (
            <div className="p-6 space-y-6" role="status" aria-label="Loading travel grant details">
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
              <span className="sr-only">Loading travel grant details, please wait...</span>
            </div>
          ) : granteeDetails ? (
            <div className="flex flex-col h-full">
              {/* Dynamic Gradient Header based on status */}
              <header className={`relative p-6 pb-16 ${
                getTravelGrantStatus(granteeDetails.participant) === 'approved' 
                  ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500'
                  : getTravelGrantStatus(granteeDetails.participant) === 'rejected'
                  ? 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-500'
                  : 'bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500'
              }`}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative z-10">
                  <SheetHeader className="text-white">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <SheetTitle 
                          id="travel-grant-sheet-title"
                          className="text-2xl font-bold text-white flex items-center gap-2"
                        >
                          <Plane className="h-6 w-6" aria-hidden="true" />
                          Travel Grant Application
                        </SheetTitle>
                        <SheetDescription 
                          id="travel-grant-sheet-description"
                          className="text-white/80"
                        >
                          Review application details and manage status
                        </SheetDescription>
                      </div>
                      {(() => {
                        const status = getTravelGrantStatus(granteeDetails.participant);
                        return (
                          <Badge 
                            className={`gap-1.5 px-3 py-1.5 text-sm font-medium backdrop-blur-sm ${
                              status === 'approved' 
                                ? 'bg-white/20 text-white border-white/30'
                                : status === 'rejected'
                                ? 'bg-white/20 text-white border-white/30'
                                : 'bg-white/20 text-white border-white/30'
                            }`}
                          >
                            {status === 'approved' && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                            {status === 'rejected' && <XCircle className="h-4 w-4" aria-hidden="true" />}
                            {status === 'pending' && <Clock className="h-4 w-4" aria-hidden="true" />}
                            <span className="capitalize">{status}</span>
                          </Badge>
                        );
                      })()}
                    </div>
                  </SheetHeader>
                </div>
                {/* Decorative plane icon */}
                <div className="absolute bottom-12 right-6 opacity-20">
                  <Plane className="h-24 w-24 text-white transform rotate-12" aria-hidden="true" />
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
                        className={`h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md ${
                          getTravelGrantStatus(granteeDetails.participant) === 'approved'
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                            : getTravelGrantStatus(granteeDetails.participant) === 'rejected'
                            ? 'bg-gradient-to-br from-red-400 to-rose-500'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500'
                        }`}
                        aria-hidden="true"
                      >
                        {granteeDetails.participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl truncate">
                          {granteeDetails.participant.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {granteeDetails.participant.email}
                        </p>
                        {granteeDetails.participant.organization && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            <span className="truncate">{granteeDetails.participant.organization}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Timeline/Progress */}
              {getTravelGrantStatus(granteeDetails.participant) === 'pending' && (
                <section className="px-6 py-4" aria-labelledby="pending-notice">
                  <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        </div>
                        <div>
                          <h4 id="pending-notice" className="font-semibold text-amber-800 dark:text-amber-200">
                            Awaiting Review
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            This travel grant application is pending review. Please review the applicant&apos;s details and activity before making a decision.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Stats Section - Check-in Progress */}
              <section 
                className="px-6 py-4"
                aria-labelledby="grantee-stats-heading"
              >
                <h4 id="grantee-stats-heading" className="sr-only">Check-in Progress Statistics</h4>
                <div className="grid grid-cols-2 gap-3" role="list" aria-label="Check-in progress statistics">
                  {/* Check-in Progress Card */}
                  <div 
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20"
                    role="listitem"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 h-16 w-16 rounded-full bg-primary/10" aria-hidden="true" />
                    <CheckCircle2 className="h-5 w-5 text-primary mb-2" aria-hidden="true" />
                    <p 
                      className="text-3xl font-bold text-primary"
                      aria-label={`${granteeDetails.checkInProgress.completed} of ${granteeDetails.checkInProgress.total} check-ins completed`}
                    >
                      {granteeDetails.checkInProgress.completed}/{granteeDetails.checkInProgress.total}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Check-in Progress</p>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${granteeDetails.checkInProgress.percentage}%` }}
                        role="progressbar"
                        aria-valuenow={granteeDetails.checkInProgress.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                  {/* Sessions Registered Card */}
                  <div 
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 border border-blue-500/20"
                    role="listitem"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 h-16 w-16 rounded-full bg-blue-500/10" aria-hidden="true" />
                    <Calendar className="h-5 w-5 text-blue-600 mb-2" aria-hidden="true" />
                    <p 
                      className="text-3xl font-bold text-blue-600"
                      aria-label={`${granteeDetails.stats.totalRegisteredSessions} sessions registered`}
                    >
                      {granteeDetails.stats.totalRegisteredSessions}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Sessions Registered</p>
                  </div>
                </div>
              </section>

              {/* Applicant Activity Summary */}
              <section className="px-6 py-2" aria-labelledby="activity-heading">
                <h4 id="activity-heading" className="font-semibold mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" aria-hidden="true" />
                  Activity Summary
                </h4>
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Participant Status</span>
                      <Badge variant={granteeDetails.participant.isActive ? 'default' : 'secondary'}>
                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${granteeDetails.participant.isActive ? 'bg-green-500' : 'bg-gray-400'}`} aria-hidden="true" />
                        {granteeDetails.participant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Check-in Rate</span>
                      <span className="font-semibold">{granteeDetails.checkInProgress.percentage}%</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Organization</span>
                      <span className="font-semibold text-sm truncate max-w-[200px]">
                        {granteeDetails.participant.organization || 'Not specified'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Last Check-ins */}
              <section 
                className="flex-1 px-6 py-4"
                aria-labelledby="checkins-heading"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 id="checkins-heading" className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" aria-hidden="true" />
                    Last Check-ins
                    <Badge variant="secondary" className="ml-1">
                      {granteeDetails.lastCheckIns.length}
                    </Badge>
                  </h4>
                </div>
                
                {granteeDetails.lastCheckIns.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <QrCode className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <p className="font-medium text-muted-foreground">No check-ins yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This participant hasn&apos;t checked into any sessions
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div 
                    className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin"
                    role="list"
                    aria-label="List of recent check-ins"
                  >
                    {granteeDetails.lastCheckIns.map((checkIn, index) => (
                      <motion.div
                        key={checkIn._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start justify-between p-3 border rounded-xl hover:bg-accent/50 transition-colors"
                        role="listitem"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div 
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                              checkIn.method === 'qr' 
                                ? 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary' 
                                : 'bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-600'
                            }`}
                            aria-hidden="true"
                          >
                            {checkIn.method === 'qr' ? (
                              <QrCode className="h-5 w-5" />
                            ) : (
                              <UserCheck className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{checkIn.sessionName}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{checkIn.sessionLocation || 'No location'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              <span title={formatFullDateTime(checkIn.checkInTime)}>
                                {formatCheckInTime(checkIn.checkInTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              checkIn.method === 'qr' 
                                ? 'border-primary/50 text-primary' 
                                : 'border-blue-500/50 text-blue-600'
                            }`}
                          >
                            {checkIn.method === 'qr' ? 'QR Scan' : 'Manual'}
                          </Badge>
                          {checkIn.isLate && (
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                              <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                              Late
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              {/* Footer Actions */}
              {getTravelGrantStatus(granteeDetails.participant) === 'pending' ? (
                <footer className="sticky bottom-0 bg-background border-t p-4 mt-auto">
                  <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground">
                      Make a decision on this travel grant application
                    </p>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(granteeDetails.participant)}
                        aria-label={`Approve travel grant for ${granteeDetails.participant.name}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                        Approve Grant
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReject(granteeDetails.participant)}
                        aria-label={`Reject travel grant for ${granteeDetails.participant.name}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </footer>
              ) : (
                <footer className="sticky bottom-0 bg-background border-t p-4 mt-auto">
                  <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${
                    getTravelGrantStatus(granteeDetails.participant) === 'approved'
                      ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}>
                    {getTravelGrantStatus(granteeDetails.participant) === 'approved' ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        <span className="font-medium">This travel grant has been approved</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" aria-hidden="true" />
                        <span className="font-medium">This travel grant has been rejected</span>
                      </>
                    )}
                  </div>
                </footer>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Action Confirmation Dialog - Enhanced */}
      <AlertDialog 
        open={actionDialog.open} 
        onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                actionDialog.type === 'approve' 
                  ? 'bg-green-100 dark:bg-green-900' 
                  : 'bg-destructive/10'
              }`}>
                {actionDialog.type === 'approve' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                )}
              </div>
              <AlertDialogTitle>
                {actionDialog.type === 'approve' ? 'Approve Travel Grant' : 'Reject Travel Grant'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to {actionDialog.type} the travel grant application for{' '}
                <strong>{actionDialog.participant?.name}</strong>?
              </p>
              
              {actionDialog.type === 'approve' ? (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    ✅ Upon approval:
                  </p>
                  <ul className="text-sm text-green-600 dark:text-green-400 mt-1 ml-4 list-disc">
                    <li>Participant will be notified of approval</li>
                    <li>Travel grant status will be marked as approved</li>
                    <li>This can be changed later if needed</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive dark:text-red-400 font-medium">
                    ⚠️ Upon rejection:
                  </p>
                  <ul className="text-sm text-destructive/80 dark:text-red-300 mt-1 ml-4 list-disc">
                    <li>Participant will be notified of rejection</li>
                    <li>This action cannot be easily undone</li>
                    <li>Consider reaching out to the applicant first</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog.participant) {
                  if (actionDialog.type === 'approve') {
                    approveMutation.mutate(actionDialog.participant._id);
                  } else {
                    rejectMutation.mutate(actionDialog.participant._id);
                  }
                }
              }}
              className={actionDialog.type === 'reject' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-green-600 hover:bg-green-700'
              }
            >
              {actionDialog.type === 'approve' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Approve Grant
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reject Application
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
