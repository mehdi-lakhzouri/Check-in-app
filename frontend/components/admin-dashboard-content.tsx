'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  staggerContainer, 
  cardVariants, 
  tableRowVariants, 
  pageTransition, 
  TIMING, 
  EASING 
} from '@/lib/animations';

// Aliases for backwards compatibility
const containerVariants = staggerContainer;
import {
  Users,
  Award,
  Plane,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminDashboard,
  useAmbassadorLeaderboard,
  useAmbassadorActivity,
  useTravelGrantApplications,
  useTravelGrantStats,
  useDecideTravelGrant,
} from '@/lib/hooks';
import { toast } from 'sonner';
import type {
  AmbassadorLeaderboardItem,
  TravelGrantApplication,
} from '@/lib/api/services/admin';

// Animation variants imported from @/lib/animations
// Using: staggerContainer, cardVariants, tableRowVariants, pageTransition

const itemVariants = cardVariants; // alias for backwards compatibility

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
      color: 'text-amber-500',
    },
    {
      title: 'Travel Grant Applicants',
      value: travelGrantStats?.total ?? 0,
      description: `${travelGrantStats?.pending ?? 0} pending review`,
      icon: Plane,
      color: 'text-blue-500',
    },
    {
      title: 'Approved Grants',
      value: travelGrantStats?.approved ?? 0,
      description: `${((travelGrantStats?.approved ?? 0) / Math.max(travelGrantStats?.total ?? 1, 1) * 100).toFixed(0)}% approval rate`,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      title: 'Pending Decisions',
      value: travelGrantStats?.pending ?? 0,
      description: 'Awaiting admin review',
      icon: Clock,
      color: 'text-orange-500',
    },
  ];

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => (
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
// Leaderboard Component
// ============================================================================

interface LeaderboardProps {
  data?: AmbassadorLeaderboardItem[];
  isLoading: boolean;
  onViewDetails: (ambassador: AmbassadorLeaderboardItem) => void;
}

function AmbassadorLeaderboard({ data, isLoading, onViewDetails }: LeaderboardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ambassador Leaderboard
          </CardTitle>
          <CardDescription>Loading top performers...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
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
    if (rank === 1) return <Badge className="bg-amber-500 hover:bg-amber-600">🥇 1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-700 hover:bg-amber-800">🥉 3rd</Badge>;
    return <Badge variant="secondary">#{rank}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Ambassador Leaderboard
            </CardTitle>
            <CardDescription>Top performing ambassadors by referral points</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="space-y-4">
            {data.map((ambassador, index) => (
              <motion.div
                key={ambassador._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onViewDetails(ambassador)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold">
                  {ambassador.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{ambassador.name}</p>
                    {getRankBadge(ambassador.rank ?? index + 1)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {ambassador.organization || ambassador.email}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-bold text-amber-600">
                    <TrendingUp className="h-4 w-4" />
                    {ambassador.ambassadorPoints}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ambassador.referredParticipantIds.length} referrals
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No ambassadors yet</p>
            <p className="text-sm">Ambassadors will appear here once they start referring participants</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Travel Grant Applications Component
// ============================================================================

interface TravelGrantApplicationsProps {
  data?: TravelGrantApplication[];
  isLoading: boolean;
  onApprove: (application: TravelGrantApplication) => void;
  onReject: (application: TravelGrantApplication) => void;
  onViewDetails: (application: TravelGrantApplication) => void;
}

function TravelGrantApplications({
  data,
  isLoading,
  onApprove,
  onReject,
  onViewDetails,
}: TravelGrantApplicationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = data?.filter((app) => {
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

  const getStatusBadge = (app: TravelGrantApplication) => {
    if (app.travelGrantApproved === null) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
    if (app.travelGrantApproved) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-500" />
            Travel Grant Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" />
              Travel Grant Applications
            </CardTitle>
            <CardDescription>Manage and review travel grant requests</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData && filteredData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredData.map((application) => (
                  <motion.tr
                    key={application._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{application.name}</p>
                        <p className="text-sm text-muted-foreground">{application.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{application.organization || '-'}</TableCell>
                    <TableCell>
                      {application.travelGrantAppliedAt
                        ? new Date(application.travelGrantAppliedAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(application)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onViewDetails(application)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {application.travelGrantApproved === null && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onApprove(application)}
                                className="text-green-600"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onReject(application)}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No applications found</p>
            <p className="text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Travel grant applications will appear here'}
            </p>
          </div>
        )}
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Ambassador Details
          </DialogTitle>
          <DialogDescription>
            View ambassador activity and referral information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : activity ? (
          <div className="space-y-6">
            {/* Ambassador Info */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-2xl font-bold">
                {activity.participant.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{activity.participant.name}</h3>
                <p className="text-muted-foreground">{activity.participant.email}</p>
                {activity.participant.organization && (
                  <p className="text-sm text-muted-foreground">{activity.participant.organization}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-600">{activity.totalPoints}</div>
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
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-muted-foreground">{participant.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{participant.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
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
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load ambassador details</p>
          </div>
        )}

        <DialogFooter>
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
          <AlertDialogTitle>
            {action === 'approve' ? 'Approve Travel Grant' : 'Reject Travel Grant'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'approve' ? (
              <>
                Are you sure you want to approve the travel grant application for{' '}
                <strong>{application?.name}</strong>? This action will notify the applicant.
              </>
            ) : (
              <>
                Are you sure you want to reject the travel grant application for{' '}
                <strong>{application?.name}</strong>? This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    onSuccess: (data, variables) => {
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
    // For now, just show a toast - could open a details dialog
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage Ambassadors and Travel Grants
          </p>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage Ambassadors and Travel Grants
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            General Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Detailed View
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-blue-500" />
                    Travel Grant Summary
                  </CardTitle>
                  <CardDescription>Application processing overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : travelGrantStats ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Processing Progress</span>
                          <span className="font-medium">
                            {travelGrantStats.total - travelGrantStats.pending} / {travelGrantStats.total}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((travelGrantStats.total - travelGrantStats.pending) /
                              Math.max(travelGrantStats.total, 1)) *
                            100
                          }
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                          <div className="text-2xl font-bold text-yellow-600">
                            {travelGrantStats.pending}
                          </div>
                          <div className="text-xs text-yellow-700 dark:text-yellow-400">Pending</div>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                          <div className="text-2xl font-bold text-green-600">
                            {travelGrantStats.approved}
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-400">Approved</div>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                          <div className="text-2xl font-bold text-red-600">
                            {travelGrantStats.rejected}
                          </div>
                          <div className="text-xs text-red-700 dark:text-red-400">Rejected</div>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setActiveTab('detailed')}
                      >
                        View All Applications
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Detailed View Tab */}
        <TabsContent value="detailed" className="space-y-6">
          <motion.div variants={itemVariants}>
            <TravelGrantApplications
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
