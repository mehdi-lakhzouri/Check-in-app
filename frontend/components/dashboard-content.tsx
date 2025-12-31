'use client';

import { motion } from 'framer-motion';
import { Users, Calendar, UserCheck, ClipboardCheck, RefreshCw } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function DashboardContent() {
  const queryClient = useQueryClient();
  const { stats, recentSessions, recentCheckIns, isLoading, isError, error } = useDashboard();

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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the IASTAM Conference Check-in System
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Total Participants"
            value={stats.totalParticipants}
            description="Active participants"
            icon={Users}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Sessions"
            value={stats.totalSessions}
            description="Conference sessions"
            icon={Calendar}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Check-ins"
            value={stats.totalCheckIns}
            description="Total attendance"
            icon={UserCheck}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            title="Registrations"
            value={stats.totalRegistrations}
            description="Session registrations"
            icon={ClipboardCheck}
          />
        </motion.div>
      </motion.div>

      {/* Recent Sessions and Check-ins */}
      <motion.div className="grid gap-4 md:grid-cols-2" variants={containerVariants}>
        {/* Recent Sessions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Latest conference sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.length > 0 ? (
                    recentSessions.map((session) => (
                      <TableRow key={session._id}>
                        <TableCell className="font-medium">{session.name}</TableCell>
                        <TableCell>
                          <Badge variant={session.isOpen ? 'default' : 'secondary'}>
                            {session.isOpen ? 'Open' : 'Closed'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No sessions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Check-ins */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>Latest participant check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCheckIns.length > 0 ? (
                    recentCheckIns.map((checkIn) => (
                      <TableRow key={checkIn._id}>
                        <TableCell className="font-medium">
                          {new Date(checkIn.checkInTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              checkIn.status === 'present'
                                ? 'default'
                                : checkIn.status === 'late'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {checkIn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No check-ins found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
