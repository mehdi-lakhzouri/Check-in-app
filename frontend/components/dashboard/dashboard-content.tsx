'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  UserCheck,
  ClipboardCheck,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCardsSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { SessionOverview } from '@/components/session-overview';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  staggerContainer,
  cardVariants,
  tableRowVariants,
  pageTransition,
  TIMING,
  EASING,
} from '@/lib/animations';

// Common components
import { PageHeader, StatsGrid, StatCard } from '@/components/common';

// Hooks
import { useDashboard } from '@/lib/hooks';

// =============================================================================
// Main Component
// =============================================================================

export function DashboardContent() {
  const queryClient = useQueryClient();
  const { stats, recentSessions, recentCheckIns, sessions, checkIns, isLoading, isError } =
    useDashboard();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard"
          description="Welcome to the Check-in App Dashboard"
        />
        <StatsCardsSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={3} columns={2} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={3} columns={2} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard"
          description="Welcome to the Check-in App Dashboard"
        />
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load dashboard</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: TIMING.normal, ease: EASING.smooth }}
      >
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard"
          description="Welcome to the Check-in App Dashboard"
          onRefresh={handleRefresh}
        />
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
          <StatCard
            title="Total Participants"
            value={stats.totalParticipants}
            description="Active participants"
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Sessions"
            value={stats.totalSessions}
            description="Conference sessions"
            icon={Calendar}
            variant="info"
          />
          <StatCard
            title="Check-ins"
            value={stats.totalCheckIns}
            description="Total attendance"
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="Registrations"
            value={stats.totalRegistrations}
            description="Session registrations"
            icon={ClipboardCheck}
            variant="warning"
          />
        </StatsGrid>
      </motion.div>

      {/* Real-time Session Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: TIMING.normal, delay: 0.4 }}
      >
        <SessionOverview sessions={sessions} checkIns={checkIns} />
      </motion.div>

      {/* Recent Sessions and Check-ins */}
      <motion.div
        className="grid gap-4 md:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Recent Sessions */}
        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Recent Sessions
              </CardTitle>
              <CardDescription>Latest conference sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-center">Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {recentSessions.length > 0 ? (
                      recentSessions.map((session, index) => (
                        <motion.tr
                          key={session._id}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ delay: index * 0.05 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">{session.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={session.isOpen ? 'default' : 'secondary'}>
                              {session.isOpen ? 'Open' : 'Closed'}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          No sessions found
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Check-ins */}
        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Recent Check-ins
              </CardTitle>
              <CardDescription>Latest participant check-ins</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-center">Time</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {recentCheckIns.length > 0 ? (
                      recentCheckIns.map((checkIn, index) => (
                        <motion.tr
                          key={checkIn._id}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ delay: index * 0.05 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">
                            {new Date(checkIn.checkInTime).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={checkIn.isLate ? 'secondary' : 'default'}>
                              {checkIn.isLate ? 'Late' : 'On Time'}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          No check-ins found
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default DashboardContent;
