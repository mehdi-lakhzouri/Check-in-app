'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';

import {
  Award,
  Plane,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  FileText,
  Activity,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/stats-card';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDashboard,
  useAmbassadorActivity,
  useTravelGrantApplications,
  useDecideTravelGrant,
} from '@/lib/hooks';
import { toast } from 'sonner';
import type {
  AmbassadorLeaderboardItem,
  TravelGrantApplication,
} from '@/lib/api/services/admin';

// Animation variants
const containerVariants = staggerContainer;
const itemVariants = cardVariants;

// ============================================================================
// Stats Overview Component
// ============================================================================

interface StatsOverviewProps {
  participantStats?: {
    total: number;
    active: number;
    ambassadors: number;
    travelGrant: number;
  };
  travelGrantStats?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  isLoading: boolean;
}

function StatsOverview({ participantStats, travelGrantStats, isLoading }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Ambassadors',
      value: participantStats?.ambassadors ?? 0,
      description: 'Active program members',
      icon: Award,
    },
    {
      title: 'Travel Grant Applicants',
      value: travelGrantStats?.total ?? 0,
      description: `${travelGrantStats?.pending ?? 0} pending review`,
      icon: Plane,
    },
    {
      title: 'Approved Grants',
      value: travelGrantStats?.approved ?? 0,
      description: `${((travelGrantStats?.approved ?? 0) / Math.max(travelGrantStats?.total ?? 1, 1) * 100).toFixed(0)}% approval rate`,
      icon: CheckCircle2,
    },
    {
      title: 'Pending Decisions',
      value: travelGrantStats?.pending ?? 0,
      description: 'Awaiting admin review',
      icon: Clock,
    },
  ];

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <StatsCard
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// Ambassador Leaderboard Component
// ============================================================================

interface LeaderboardProps {
  data?: AmbassadorLeaderboardItem[];
  isLoading: boolean;
  onViewDetails: (ambassador: AmbassadorLeaderboardItem) => void;
}

function AmbassadorLeaderboard({ data, isLoading, onViewDetails }: LeaderboardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Ambassador Leaderboard
          </CardTitle>
          <CardDescription>Loading top performers...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">1st</Badge>;
    if (rank === 2) return <Badge className="bg-slate-400 hover:bg-slate-500 text-xs">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-700 hover:bg-amber-800 text-xs">3rd</Badge>;
    return <Badge variant="secondary" className="text-xs">#{rank}</Badge>;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Ambassador Leaderboard
            </CardTitle>
            <CardDescription>Top performers by referral points</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {data && data.length > 0 ? (
          <div className="space-y-3">
            {data.slice(0, 5).map((ambassador, index) => (
              <motion.button
                key={ambassador._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group w-full text-left"
                onClick={() => onViewDetails(ambassador)}
                aria-label={`View details for ${ambassador.name}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-sm shrink-0">
                  {ambassador.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{ambassador.name}</span>
                    {getRankBadge(ambassador.rank ?? index + 1)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {ambassador.organization || ambassador.email}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 font-bold text-amber-600">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    {ambassador.ambassadorPoints}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ambassador.referredParticipantIds.length} referrals
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
            <p className="font-medium">No ambassadors yet</p>
            <p className="text-sm">Ambassadors will appear here once they start referring participants</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Travel Grant Summary Card
// ============================================================================

interface TravelGrantSummaryProps {
  stats?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  isLoading: boolean;
  onViewAll: () => void;
}

function TravelGrantSummary({ stats, isLoading, onViewAll }: TravelGrantSummaryProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Travel Grant Summary
        </CardTitle>
        <CardDescription>Application processing overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : stats ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing Progress</span>
                <span className="font-medium tabular-nums">
                  {stats.total - stats.pending} / {stats.total}
                </span>
              </div>
              <Progress
                value={((stats.total - stats.pending) / Math.max(stats.total, 1)) * 100}
                aria-label="Processing progress"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="text-2xl font-bold text-amber-600 tabular-nums">
                  {stats.pending}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 tabular-nums">
                  {stats.approved}
                </div>
                <div className="text-xs text-green-700 dark:text-green-400 font-medium">Approved</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600 tabular-nums">
                  {stats.rejected}
                </div>
                <div className="text-xs text-red-700 dark:text-red-400 font-medium">Rejected</div>
              </div>
            </div>

            <Button className="w-full" variant="outline" onClick={onViewAll}>
              View All Applications
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Travel Grant Applications Table (Detailed View)
// ============================================================================

interface TravelGrantTableProps {
  data?: TravelGrantApplication[];
  isLoading: boolean;
  onApprove: (application: TravelGrantApplication) => void;
  onReject: (application: TravelGrantApplication) => void;
  onViewDetails: (application: TravelGrantApplication) => void;
}

function TravelGrantTable({
  data,
  isLoading,
  onApprove,
  onReject,
  onViewDetails,
}: TravelGrantTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && app.travelGrantApproved === null) ||
        (statusFilter === 'approved' && app.travelGrantApproved === true) ||
        (statusFilter === 'rejected' && app.travelGrantApproved === false);

      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusBadge = (app: TravelGrantApplication) => {
    if (app.travelGrantApproved === null) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
          Pending
        </Badge>
      );
    }
    if (app.travelGrantApproved) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
        Rejected
      </Badge>
    );
  };

  const columns: DataTableColumn<TravelGrantApplication>[] = [
    {
      id: 'applicant',
      header: 'Applicant',
      cell: (app) => (
        <div className="min-w-[200px]">
          <p className="font-medium truncate">{app.name}</p>
          <p className="text-sm text-muted-foreground truncate">{app.email}</p>
        </div>
      ),
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: (app) => (
        <span className="text-muted-foreground truncate max-w-[150px] block">
          {app.organization || '—'}
        </span>
      ),
    },
    {
      id: 'applied',
      header: 'Applied',
      align: 'center',
      cell: (app) => (
        <span className="text-sm tabular-nums">
          {app.travelGrantAppliedAt
            ? new Date(app.travelGrantAppliedAt).toLocaleDateString()
            : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: (app) => getStatusBadge(app),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'center',
      cell: (app) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewDetails(app)}>
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              View Details
            </DropdownMenuItem>
            {app.travelGrantApproved === null && (
              <>
                <DropdownMenuItem onClick={() => onApprove(app)} className="text-green-600">
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(app)} className="text-red-600">
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" aria-hidden="true" />
              Travel Grant Applications
            </CardTitle>
            <CardDescription>Manage and review travel grant requests</CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search by name, email, organization..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
              aria-label="Search applications"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          data={paginatedData}
          columns={columns}
          getRowId={(app) => app._id}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isLoading={isLoading}
          emptyMessage="No applications found"
          emptyDescription={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Travel grant applications will appear here'
          }
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredData.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(perPage) => {
            setItemsPerPage(perPage);
            setCurrentPage(1);
          }}
          stickyHeader={true}
          maxHeight="500px"
          ariaLabel="Travel grant applications table"
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Ambassador Details Dialog
// ============================================================================

interface AmbassadorDetailsDialogProps {
  ambassador: AmbassadorLeaderboardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AmbassadorDetailsDialog({
  ambassador,
  open,
  onOpenChange,
}: AmbassadorDetailsDialogProps) {
  const { data: activity, isLoading } = useAmbassadorActivity(ambassador?._id ?? '', {
    enabled: !!ambassador?._id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Ambassador Details
          </DialogTitle>
          <DialogDescription>
            View ambassador activity and referral information
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : activity ? (
            <div className="space-y-6 py-4">
              {/* Ambassador Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-2xl font-bold shrink-0">
                  {activity.participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{activity.participant.name}</h3>
                  <p className="text-muted-foreground truncate">{activity.participant.email}</p>
                  {activity.participant.organization && (
                    <p className="text-sm text-muted-foreground truncate">{activity.participant.organization}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-bold text-amber-600 tabular-nums">{activity.totalPoints}</div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>
              </div>

              {/* Referred Participants */}
              <div>
                <h4 className="font-medium mb-3">
                  Referred Participants ({activity.referredParticipants.length})
                </h4>
                {activity.referredParticipants.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {activity.referredParticipants.map((participant) => (
                      <div
                        key={participant._id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{participant.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{participant.email}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <Badge variant="secondary">{participant.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                            {new Date(participant.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No referred participants yet
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>Unable to load ambassador details</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Travel Grant Decision Dialog
// ============================================================================

interface TravelGrantDecisionDialogProps {
  application: TravelGrantApplication | null;
  action: 'approve' | 'reject' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function TravelGrantDecisionDialog({
  application,
  action,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: TravelGrantDecisionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {action === 'approve' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
            )}
            {action === 'approve' ? 'Approve Travel Grant' : 'Reject Travel Grant'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {action === 'approve' ? (
                <p>
                  Are you sure you want to approve the travel grant application for{' '}
                  <strong className="text-foreground">{application?.name}</strong>?
                </p>
              ) : (
                <p>
                  Are you sure you want to reject the travel grant application for{' '}
                  <strong className="text-foreground">{application?.name}</strong>?
                </p>
              )}
              <p className="text-sm">The applicant will be notified of this decision.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-600'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {action === 'approve' ? 'Approve' : 'Reject'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Main Admin Dashboard Component
// ============================================================================

export function AdminDashboardContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAmbassador, setSelectedAmbassador] = useState<AmbassadorLeaderboardItem | null>(null);
  const [ambassadorDialogOpen, setAmbassadorDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<TravelGrantApplication | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);

  // Queries
  const {
    participantStats,
    travelGrantStats,
    leaderboard,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminDashboard({ enablePolling: true });

  const {
    data: applications,
    isLoading: applicationsLoading,
  } = useTravelGrantApplications(undefined, { enablePolling: true });

  // Mutations
  const decideMutation = useDecideTravelGrant({
    onSuccess: (_, variables) => {
      toast.success(
        variables.approved ? 'Travel grant approved successfully' : 'Travel grant rejected'
      );
      setDecisionDialogOpen(false);
      setSelectedApplication(null);
      setDecisionAction(null);
    },
    onError: (error) => {
      toast.error('Failed to process decision: ' + error.message);
    },
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    refetch();
    toast.success('Dashboard refreshed');
  }, [queryClient, refetch]);

  const handleViewAmbassadorDetails = useCallback((ambassador: AmbassadorLeaderboardItem) => {
    setSelectedAmbassador(ambassador);
    setAmbassadorDialogOpen(true);
  }, []);

  const handleApproveApplication = useCallback((application: TravelGrantApplication) => {
    setSelectedApplication(application);
    setDecisionAction('approve');
    setDecisionDialogOpen(true);
  }, []);

  const handleRejectApplication = useCallback((application: TravelGrantApplication) => {
    setSelectedApplication(application);
    setDecisionAction('reject');
    setDecisionDialogOpen(true);
  }, []);

  const handleViewApplicationDetails = useCallback((application: TravelGrantApplication) => {
    toast.info(`Viewing details for ${application.name}`);
  }, []);

  const handleConfirmDecision = useCallback(() => {
    if (selectedApplication && decisionAction) {
      decideMutation.mutate({
        id: selectedApplication._id,
        approved: decisionAction === 'approve',
      });
    }
  }, [selectedApplication, decisionAction, decideMutation]);

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage Ambassadors and Travel Grants</p>
          </div>
        </div>
        <ErrorState
          error={error}
          onRetry={handleRefresh}
          title="Failed to load admin dashboard"
          description="Unable to fetch dashboard data from the server."
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage Ambassadors and Travel Grants</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" aria-hidden="true" />
            General Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Detailed View
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <motion.div variants={itemVariants}>
            <StatsOverview
              participantStats={participantStats}
              travelGrantStats={travelGrantStats}
              isLoading={isLoading}
            />
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={itemVariants}>
              <AmbassadorLeaderboard
                data={leaderboard}
                isLoading={isLoading}
                onViewDetails={handleViewAmbassadorDetails}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <TravelGrantSummary
                stats={travelGrantStats}
                isLoading={isLoading}
                onViewAll={() => setActiveTab('detailed')}
              />
            </motion.div>
          </div>
        </TabsContent>

        {/* Detailed View Tab */}
        <TabsContent value="detailed" className="space-y-6 mt-0">
          <motion.div variants={itemVariants}>
            <TravelGrantTable
              data={applications}
              isLoading={applicationsLoading}
              onApprove={handleApproveApplication}
              onReject={handleRejectApplication}
              onViewDetails={handleViewApplicationDetails}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AmbassadorDetailsDialog
        ambassador={selectedAmbassador}
        open={ambassadorDialogOpen}
        onOpenChange={setAmbassadorDialogOpen}
      />

      <TravelGrantDecisionDialog
        application={selectedApplication}
        action={decisionAction}
        open={decisionDialogOpen}
        onOpenChange={setDecisionDialogOpen}
        onConfirm={handleConfirmDecision}
        isLoading={decideMutation.isPending}
      />
    </motion.div>
  );
}
