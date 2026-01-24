'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, cardVariants } from '@/lib/animations';
import {
  UserCheck,
  QrCode,
  Keyboard,
  CalendarCheck,
} from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  isWithinInterval,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, DataTableSkeleton, type DataTableColumn } from '@/components/ui/data-table';

// Common components
import {
  PageHeader,
  StatsGrid,
  StatCard,
} from '@/components/common';

import { CheckinsFilterBar } from './checkins-filter-bar';

// Module types
import type { PopulatedCheckIn, DateFilter } from './types';

// Hooks
import { useCheckIns, useCheckInStats, useSessions } from '@/lib/hooks';

// =============================================================================
// Helpers
// =============================================================================

function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy HH:mm');
}

// =============================================================================
// Main Component
// =============================================================================

export function CheckInsContent() {
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch data
  const {
    data: checkIns = [],
    isLoading,
    isError,
    refetch,
  } = useCheckIns();

  const { data: sessions = [] } = useSessions();
  const { data: stats, isLoading: isStatsLoading } = useCheckInStats();

  const populatedCheckIns = checkIns as PopulatedCheckIn[];

  // Filter and search check-ins
  const filteredCheckIns = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const last7DaysStart = startOfDay(subDays(now, 7));
    const last30DaysStart = startOfDay(subDays(now, 30));
    const thisMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

    return populatedCheckIns.filter((checkIn) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const participantName =
          typeof checkIn.participantId === 'object' && checkIn.participantId?.name
            ? checkIn.participantId.name.toLowerCase()
            : '';
        const sessionName =
          typeof checkIn.sessionId === 'object' && checkIn.sessionId?.name
            ? checkIn.sessionId.name.toLowerCase()
            : '';
        const participantEmail =
          typeof checkIn.participantId === 'object' && checkIn.participantId
            ? (checkIn.participantId.email || '').toLowerCase()
            : '';

        if (
          !participantName.includes(query) &&
          !sessionName.includes(query) &&
          !participantEmail.includes(query)
        ) {
          return false;
        }
      }

      // Session filter
      if (sessionFilter !== 'all') {
        const sessionId =
          typeof checkIn.sessionId === 'object' && checkIn.sessionId?._id
            ? checkIn.sessionId._id
            : checkIn.sessionId;
        if (sessionId !== sessionFilter) return false;
      }

      // Status filter (late/ontime)
      if (statusFilter !== 'all') {
        if (statusFilter === 'late' && !checkIn.isLate) return false;
        if (statusFilter === 'ontime' && checkIn.isLate) return false;
      }

      // Method filter
      if (methodFilter !== 'all' && checkIn.method !== methodFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const checkInDate = new Date(checkIn.checkInTime);
        switch (dateFilter) {
          case 'today':
            if (!isWithinInterval(checkInDate, { start: todayStart, end: todayEnd })) return false;
            break;
          case 'yesterday':
            if (!isWithinInterval(checkInDate, { start: yesterdayStart, end: yesterdayEnd }))
              return false;
            break;
          case 'last7days':
            if (checkInDate < last7DaysStart) return false;
            break;
          case 'last30days':
            if (checkInDate < last30DaysStart) return false;
            break;
          case 'thisMonth':
            if (checkInDate < thisMonthStart) return false;
            break;
        }
      }

      return true;
    });
  }, [populatedCheckIns, searchQuery, sessionFilter, statusFilter, methodFilter, dateFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCheckIns.length / itemsPerPage);
  const paginatedCheckIns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCheckIns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCheckIns, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const filtersKey = `${searchQuery}-${sessionFilter}-${statusFilter}-${methodFilter}-${dateFilter}`;
  const prevFiltersKeyRef = React.useRef(filtersKey);
  React.useEffect(() => {
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      if (currentPage !== 1) {
        setTimeout(() => setCurrentPage(1), 0);
      }
    }
  }, [filtersKey, currentPage]);

  // Table columns
  const columns: DataTableColumn<PopulatedCheckIn>[] = useMemo(
    () => [
      {
        id: 'participant',
        header: 'Participant',
        cell: (checkIn) => (
          <div>
            <p className="font-medium">
              {typeof checkIn.participantId === 'object' && checkIn.participantId?.name
                ? checkIn.participantId.name
                : 'Unknown'}
            </p>
            {typeof checkIn.participantId === 'object' && checkIn.participantId?.email && (
              <p className="text-sm text-muted-foreground">{checkIn.participantId.email}</p>
            )}
          </div>
        ),
      },
      {
        id: 'session',
        header: 'Session',
        cell: (checkIn) => (
          <Badge variant="secondary" className="font-normal">
            {typeof checkIn.sessionId === 'object' && checkIn.sessionId?.name
              ? checkIn.sessionId.name
              : 'Unknown'}
          </Badge>
        ),
      },
      {
        id: 'checkInTime',
        header: 'Check-in Time',
        align: 'center',
        cell: (checkIn) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatDateTime(checkIn.checkInTime)}
          </span>
        ),
      },
      {
        id: 'method',
        header: 'Method',
        align: 'center',
        cell: (checkIn) => (
          <Badge variant="outline" className="gap-1">
            {checkIn.method === 'qr' ? (
              <>
                <QrCode className="h-3 w-3" />
                QR
              </>
            ) : (
              <>
                <Keyboard className="h-3 w-3" />
                Manual
              </>
            )}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        cell: (checkIn) => (
          <Badge variant={checkIn.isLate ? 'destructive' : 'default'}>
            {checkIn.isLate ? 'Late' : 'On Time'}
          </Badge>
        ),
      },
    ],
    []
  );

  // Calculate unique sessions count
  const uniqueSessionsCount = useMemo(() => {
    return new Set(
      populatedCheckIns
        .map((c) =>
          typeof c.sessionId === 'object' && c.sessionId?._id ? c.sessionId._id : c.sessionId
        )
        .filter(Boolean)
    ).size;
  }, [populatedCheckIns]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={UserCheck} title="Check-ins" description="Loading check-ins..." />
        <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard key={i} title="" value="" isLoading />
          ))}
        </StatsGrid>
        <Card>
          <CardContent className="pt-6">
            <DataTableSkeleton columns={5} rows={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader icon={UserCheck} title="Check-ins" description="View all participant check-ins" />
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load check-ins</p>
          <Button onClick={() => refetch()}>Retry</Button>
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
        icon={UserCheck}
        title="Check-ins"
        description={
          filteredCheckIns.length !== populatedCheckIns.length
            ? `${filteredCheckIns.length} of ${populatedCheckIns.length} shown`
            : `View all participant check-ins (${populatedCheckIns.length} total)`
        }
      />

      {/* Stats Cards */}
      <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
        <StatCard
          title="Total Check-ins"
          value={isStatsLoading ? '...' : (stats?.total ?? populatedCheckIns.length)}
          description="All time"
          icon={CalendarCheck}
          variant="primary"
        />
        <StatCard
          title="QR Check-ins"
          value={
            isStatsLoading
              ? '...'
              : (stats?.qr ?? populatedCheckIns.filter((c) => c.method === 'qr').length)
          }
          description="Via QR code"
          icon={QrCode}
          variant="info"
        />
        <StatCard
          title="Manual Check-ins"
          value={
            isStatsLoading
              ? '...'
              : (stats?.manual ?? populatedCheckIns.filter((c) => c.method === 'manual').length)
          }
          description="Manual entry"
          icon={Keyboard}
          variant="warning"
        />
        <StatCard
          title="Sessions Active"
          value={uniqueSessionsCount}
          description="With check-ins"
          icon={UserCheck}
          variant="success"
        />
      </StatsGrid>

      {/* Search & Filters */}
      <motion.div variants={cardVariants}>
        <CheckinsFilterBar
          search={searchQuery}
          setSearch={setSearchQuery}
          sessionFilter={sessionFilter}
          setSessionFilter={setSessionFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          methodFilter={methodFilter}
          setMethodFilter={setMethodFilter}
          sessions={sessions}
        />
      </motion.div>

      {/* Check-ins Table */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle>All Check-ins</CardTitle>
            <CardDescription>A complete list of participant attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<PopulatedCheckIn>
              data={paginatedCheckIns}
              columns={columns}
              getRowId={(row) => row._id}
              isLoading={false}
              emptyMessage="No check-ins found"
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCheckIns.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default CheckInsContent;
