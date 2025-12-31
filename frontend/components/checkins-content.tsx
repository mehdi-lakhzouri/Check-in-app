'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  QrCode,
  Keyboard,
  CalendarCheck,
} from 'lucide-react';
import { format } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useCheckIns, useCheckInStats, useSessions } from '@/lib/hooks';
import type { CheckIn, Participant, Session } from '@/lib/schemas';

interface PopulatedCheckIn extends Omit<CheckIn, 'participantId' | 'sessionId'> {
  participantId: Participant;
  sessionId: Session;
}

// Animation variants
const tableRowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function CheckInsContent() {
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch data
  const {
    data: checkIns = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCheckIns();

  const { data: sessions = [] } = useSessions();
  const { data: stats, isLoading: isStatsLoading } = useCheckInStats();

  const populatedCheckIns = checkIns as PopulatedCheckIn[];

  // Filter and search check-ins
  const filteredCheckIns = useMemo(() => {
    return populatedCheckIns.filter((checkIn) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const participantName = typeof checkIn.participantId === 'object' 
          ? checkIn.participantId.name.toLowerCase() 
          : '';
        const sessionName = typeof checkIn.sessionId === 'object'
          ? checkIn.sessionId.name.toLowerCase()
          : '';
        const participantEmail = typeof checkIn.participantId === 'object'
          ? (checkIn.participantId.email || '').toLowerCase()
          : '';
        
        if (!participantName.includes(query) && 
            !sessionName.includes(query) && 
            !participantEmail.includes(query)) {
          return false;
        }
      }

      // Session filter
      if (sessionFilter !== 'all') {
        const sessionId = typeof checkIn.sessionId === 'object' 
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

      return true;
    });
  }, [populatedCheckIns, searchQuery, sessionFilter, statusFilter, methodFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCheckIns.length / itemsPerPage);
  const paginatedCheckIns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCheckIns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCheckIns, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sessionFilter, statusFilter, methodFilter]);

  const hasActiveFilters = sessionFilter !== 'all' || statusFilter !== 'all' || methodFilter !== 'all';

  function clearFilters() {
    setSearchQuery('');
    setSessionFilter('all');
    setStatusFilter('all');
    setMethodFilter('all');
  }

  function formatDateTime(dateString: string): string {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Check-ins</h2>
            <p className="text-muted-foreground">Loading check-ins...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} columns={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Check-ins</h2>
            <p className="text-muted-foreground">View all participant check-ins</p>
          </div>
        </div>
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load check-ins"
          description="Unable to fetch check-ins from the server."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <UserCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Check-ins</h2>
          <p className="text-muted-foreground">
            View all participant check-ins
            {filteredCheckIns.length !== populatedCheckIns.length && (
              <Badge variant="secondary" className="ml-2">
                {filteredCheckIns.length} of {populatedCheckIns.length} shown
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? '...' : stats?.total ?? populatedCheckIns.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Check-ins</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isStatsLoading ? '...' : stats?.qr ?? populatedCheckIns.filter(c => c.method === 'qr').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Check-ins</CardTitle>
            <Keyboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isStatsLoading ? '...' : stats?.manual ?? populatedCheckIns.filter(c => c.method === 'manual').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Set(populatedCheckIns.map(c => 
                typeof c.sessionId === 'object' ? c.sessionId._id : c.sessionId
              )).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            {/* Search Row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by participant name, email, or session..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                        {[sessionFilter, statusFilter, methodFilter].filter(f => f !== 'all').length}
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Filter Options */}
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <CollapsibleContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3 pt-2">
                  <div className="space-y-2">
                    <Label>Session</Label>
                    <Select value={sessionFilter} onValueChange={setSessionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sessions</SelectItem>
                        {sessions.map((session) => (
                          <SelectItem key={session._id} value={session._id}>
                            {session.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="ontime">On Time</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All methods</SelectItem>
                        <SelectItem value="qr">QR Code</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Check-ins Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Check-ins</CardTitle>
          <CardDescription>
            A complete list of participant attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedCheckIns.length > 0 ? (
                  paginatedCheckIns.map((checkIn, index) => (
                    <motion.tr
                      key={checkIn._id}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.03 }}
                      className="border-b"
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-medium">
                            {typeof checkIn.participantId === 'object'
                              ? checkIn.participantId.name
                              : 'Unknown'}
                          </p>
                          {typeof checkIn.participantId === 'object' && checkIn.participantId.email && (
                            <p className="text-sm text-muted-foreground">
                              {checkIn.participantId.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {typeof checkIn.sessionId === 'object'
                          ? checkIn.sessionId.name
                          : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(checkIn.checkInTime)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={checkIn.isLate ? 'destructive' : 'default'}
                        >
                          {checkIn.isLate ? 'Late' : 'On Time'}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {hasActiveFilters || searchQuery
                        ? 'No check-ins match your search criteria.'
                        : 'No check-ins found.'}
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredCheckIns.length > 0 && (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4 border-t mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>of {filteredCheckIns.length} check-ins</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[100px] text-center">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
