'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Users, Calendar, UserCheck, ClipboardCheck, RefreshCw, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';
import { SessionOverview } from '@/components/session-overview';
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
import { ErrorState } from '@/components/ui/error-state';
import { useDashboard } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { 
  staggerContainer, 
  cardVariants, 
  tableRowVariants,
  pageTransition,
  TIMING,
  EASING,
  SPRING
} from '@/lib/animations';

export function DashboardContent() {
  const queryClient = useQueryClient();
  const { stats, recentSessions, recentCheckIns, sessions, checkIns, isLoading, isError, error } = useDashboard();

  // Auto-refresh every 30 seconds for real-time updates
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome to the IASTAM Conference Check-in System
            </p>
          </div>
        </div>
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

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the IASTAM Conference Check-in System
          </p>
        </div>
        <ErrorState
          error={error}
          onRetry={handleRefresh}
          title="Failed to load dashboard"
          description="Unable to fetch dashboard data from the server."
        />
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
      {/* Header with animated title */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: TIMING.normal, ease: EASING.smooth }}
      >
        <div>
          <motion.h2 
            className="text-3xl font-bold tracking-tight"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: TIMING.normal, delay: 0.1 }}
          >
            Dashboard
          </motion.h2>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: TIMING.normal, delay: 0.2 }}
          >
            Welcome to the IASTAM Conference Check-in System
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: TIMING.fast, delay: 0.3 }}
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="group"
          >
            <RefreshCw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            Refresh
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Cards with stagger animation */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatsCard
          title="Total Participants"
          value={stats.totalParticipants}
          description="Active participants"
          icon={Users}
          index={0}
          accentColor="from-blue-500/50 to-blue-500/20"
        />
        <StatsCard
          title="Sessions"
          value={stats.totalSessions}
          description="Conference sessions"
          icon={Calendar}
          index={1}
          accentColor="from-purple-500/50 to-purple-500/20"
        />
        <StatsCard
          title="Check-ins"
          value={stats.totalCheckIns}
          description="Total attendance"
          icon={UserCheck}
          index={2}
          accentColor="from-green-500/50 to-green-500/20"
        />
        <StatsCard
          title="Registrations"
          value={stats.totalRegistrations}
          description="Session registrations"
          icon={ClipboardCheck}
          index={3}
          accentColor="from-orange-500/50 to-orange-500/20"
        />
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
                    <TableHead className="text-center" scope="col">Name</TableHead>
                    <TableHead className="text-center" scope="col">Status</TableHead>
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
                            <Badge 
                              variant={session.isOpen ? 'default' : 'secondary'}
                              className="transition-all duration-200"
                            >
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
                    <TableHead className="text-center" scope="col">Time</TableHead>
                    <TableHead className="text-center" scope="col">Status</TableHead>
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
                            <Badge
                              variant={checkIn.isLate ? 'secondary' : 'default'}
                              className="transition-all duration-200"
                            >
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
