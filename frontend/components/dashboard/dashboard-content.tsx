'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  UserCheck,
  ClipboardCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  QrCode,
  UserPlus,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCardsSkeleton } from '@/components/ui/skeleton';
import { AreaChartComponent } from '@/components/ui/charts';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  staggerContainer,
  cardVariants,
  pageTransition,
  TIMING,
  EASING,
} from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/hooks';

// =============================================================================
// Elegant Stat Card Component
// =============================================================================
interface ElegantStatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

function ElegantStatCard({ title, value, change, icon: Icon, iconBgColor, iconColor }: ElegantStatCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : (value ?? '0');

  return (
    <motion.div variants={cardVariants}>
      <Card className="overflow-hidden border-none shadow-lg bg-card hover:shadow-xl transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-bold tracking-tight">{displayValue}</h3>
                {change && (
                  <span className={cn(
                    "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                    change.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {change.isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    {change.value}%
                  </span>
                )}
              </div>
            </div>
            <div className={cn("p-3 rounded-xl", iconBgColor)}>
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Quick Action Card
// =============================================================================
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  gradient: string;
}

function QuickActionCard({ title, description, icon: Icon, onClick, gradient }: QuickActionCardProps) {
  return (
    <motion.div variants={cardVariants} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
      <Card
        className={cn(
          "cursor-pointer overflow-hidden border-none shadow-lg transition-all duration-300 hover:shadow-xl",
          gradient
        )}
        onClick={onClick}
      >
        <CardContent className="p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-white/80">{description}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 opacity-70" />
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { stats, isLoading, isError, error } = useDashboard();
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
  };

  // Safe default stats to prevent render errors
  const safeStats = {
    totalParticipants: stats?.totalParticipants ?? 0,
    totalSessions: stats?.totalSessions ?? 0,
    totalCheckIns: stats?.totalCheckIns ?? 0,
    totalRegistrations: stats?.totalRegistrations ?? 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground">{greeting}</p>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          </div>
        </div>
        <StatsCardsSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Activity className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
        <p className="text-muted-foreground mb-2">Unable to load dashboard data.</p>
        {error && <p className="text-sm text-destructive mb-4">{error.message}</p>}
        <Button onClick={handleRefresh} variant="destructive">Retry</Button>
      </div>
    );
  }

  // Sample data for the chart
  const chartData = [
    { name: 'Mon', checkIns: 20, registrations: 30 },
    { name: 'Tue', checkIns: 35, registrations: 45 },
    { name: 'Wed', checkIns: 50, registrations: 40 },
    { name: 'Thu', checkIns: 40, registrations: 55 },
    { name: 'Fri', checkIns: 65, registrations: 70 },
    { name: 'Sat', checkIns: 55, registrations: 50 },
    { name: 'Sun', checkIns: 48, registrations: 60 },
  ];

  return (
    <motion.div
      className="space-y-8 pb-8"
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
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <p className="text-muted-foreground">{greeting}</p>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 self-start md:self-auto">
          <Activity className="h-4 w-4" />
          Refresh
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <ElegantStatCard
          title="Total Participants"
          value={safeStats.totalParticipants}
          change={{ value: 12, isPositive: true }}
          icon={Users}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <ElegantStatCard
          title="Active Sessions"
          value={safeStats.totalSessions}
          icon={Calendar}
          iconBgColor="bg-sky-100"
          iconColor="text-sky-600"
        />
        <ElegantStatCard
          title="Total Check-ins"
          value={safeStats.totalCheckIns}
          change={{ value: 8, isPositive: true }}
          icon={UserCheck}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <ElegantStatCard
          title="Registrations"
          value={safeStats.totalRegistrations}
          change={{ value: 5, isPositive: false }}
          icon={ClipboardCheck}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chart */}
        <motion.div className="lg:col-span-2" variants={cardVariants}>
          <AreaChartComponent
            title="Weekly Activity"
            description="Check-ins and registrations over the past week"
            data={chartData}
            index="name"
            categories={['checkIns', 'registrations']}
            colors={['#2D3282', '#16a34a']}
          />
        </motion.div>

        {/* Right Column: Quick Actions */}
        <div className="space-y-6">
          <QuickActionCard
            title="QR Check-in"
            description="Scan a participant badge"
            icon={QrCode}
            onClick={() => router.push('/checkins')}
            gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
          />
          <QuickActionCard
            title="Add Participant"
            description="Register a new attendee"
            icon={UserPlus}
            onClick={() => router.push('/participants')}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default DashboardContent;
