'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Clock,
  XCircle,
  CalendarPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ButtonLoading } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  useRegistrations,
  useRegistrationStats,
  useCreateRegistration,
  useDeleteRegistration,
  useParticipants,
  useSessions,
} from '@/lib/hooks';
import type { Registration, Participant, Session, CreateRegistrationDto } from '@/lib/schemas';

interface PopulatedRegistration extends Omit<Registration, 'participantId' | 'sessionId'> {
  participantId: Participant;
  sessionId: Session;
}

// Animation variants
const tableRowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function RegistrationsContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateRegistrationDto>({
    participantId: '',
    sessionId: '',
    status: 'confirmed',
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // TanStack Query hooks
  const {
    data: registrations = [],
    isLoading: registrationsLoading,
    isError: registrationsError,
    error: registrationsErr,
    refetch: refetchRegistrations,
  } = useRegistrations();

  const { data: stats, isLoading: isStatsLoading } = useRegistrationStats();
  const { data: participants = [], isLoading: participantsLoading } = useParticipants();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();

  const createMutation = useCreateRegistration({
    onSuccess: () => {
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useDeleteRegistration({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setRegistrationToDelete(null);
    },
  });

  const isLoading = registrationsLoading || participantsLoading || sessionsLoading;
  const populatedRegistrations = registrations as PopulatedRegistration[];

  // Filter and search registrations
  const filteredRegistrations = useMemo(() => {
    return populatedRegistrations.filter((registration) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const participantName = typeof registration.participantId === 'object'
          ? registration.participantId.name.toLowerCase()
          : '';
        const participantEmail = typeof registration.participantId === 'object'
          ? (registration.participantId.email || '').toLowerCase()
          : '';
        const sessionName = typeof registration.sessionId === 'object'
          ? registration.sessionId.name.toLowerCase()
          : '';

        if (
          !participantName.includes(query) &&
          !participantEmail.includes(query) &&
          !sessionName.includes(query)
        ) {
          return false;
        }
      }

      // Session filter
      if (sessionFilter !== 'all') {
        const sessionId = typeof registration.sessionId === 'object'
          ? registration.sessionId._id
          : registration.sessionId;
        if (sessionId !== sessionFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && registration.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [populatedRegistrations, searchQuery, sessionFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const paginatedRegistrations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRegistrations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRegistrations, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sessionFilter, statusFilter]);

  const hasActiveFilters = sessionFilter !== 'all' || statusFilter !== 'all';

  function clearFilters() {
    setSearchQuery('');
    setSessionFilter('all');
    setStatusFilter('all');
  }

  function formatDate(dateString: string): string {
    return format(new Date(dateString), 'MMM d, yyyy');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(formData);
  }

  function handleDelete(id: string) {
    setRegistrationToDelete(id);
    setDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (registrationToDelete) {
      deleteMutation.mutate(registrationToDelete);
    }
  }

  function resetForm() {
    setFormData({
      participantId: '',
      sessionId: '',
      status: 'confirmed',
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Registrations</h2>
            <p className="text-muted-foreground">Loading registrations...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
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

  if (registrationsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Registrations</h2>
            <p className="text-muted-foreground">Manage session registrations</p>
          </div>
        </div>
        <ErrorState
          error={registrationsErr}
          onRetry={() => refetchRegistrations()}
          title="Failed to load registrations"
          description="Unable to fetch registrations from the server."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Registrations</h2>
            <p className="text-muted-foreground">
              Manage session registrations
              {filteredRegistrations.length !== populatedRegistrations.length && (
                <Badge variant="secondary" className="ml-2">
                  {filteredRegistrations.length} of {populatedRegistrations.length} shown
                </Badge>
              )}
            </p>
          </div>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Registration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Registration</DialogTitle>
                <DialogDescription>
                  Register a participant for a session.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="participant">Participant</Label>
                  <Select
                    value={formData.participantId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, participantId: value })
                    }
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem key={participant._id} value={participant._id}>
                          {participant.name} ({participant.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="session">Session</Label>
                  <Select
                    value={formData.sessionId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sessionId: value })
                    }
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session._id} value={session._id}>
                          {session.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'confirmed' | 'pending' | 'cancelled') =>
                      setFormData({ ...formData, status: value })
                    }
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <ButtonLoading className="mr-2" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? '...' : stats?.total ?? populatedRegistrations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isStatsLoading
                ? '...'
                : stats?.confirmed ?? populatedRegistrations.filter((r) => r.status === 'confirmed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {isStatsLoading
                ? '...'
                : stats?.pending ?? populatedRegistrations.filter((r) => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isStatsLoading
                ? '...'
                : stats?.cancelled ?? populatedRegistrations.filter((r) => r.status === 'cancelled').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CalendarPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isStatsLoading ? '...' : stats?.todayRegistrations ?? 0}
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
                        {[sessionFilter, statusFilter].filter((f) => f !== 'all').length}
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
                <div className="grid gap-4 md:grid-cols-2 pt-2">
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
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Registrations</CardTitle>
          <CardDescription>A list of all session registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedRegistrations.length > 0 ? (
                  paginatedRegistrations.map((registration, index) => (
                    <motion.tr
                      key={registration._id}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ delay: index * 0.03 }}
                      className="border-b"
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-medium">
                            {typeof registration.participantId === 'object'
                              ? registration.participantId.name
                              : 'Unknown'}
                          </p>
                          {typeof registration.participantId === 'object' &&
                            registration.participantId.email && (
                              <p className="text-sm text-muted-foreground">
                                {registration.participantId.email}
                              </p>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {typeof registration.sessionId === 'object'
                          ? registration.sessionId.name
                          : 'Unknown'}
                      </TableCell>
                      <TableCell>{formatDate(registration.registrationDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            registration.status === 'confirmed'
                              ? 'default'
                              : registration.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(registration._id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {hasActiveFilters || searchQuery
                        ? 'No registrations match your search criteria.'
                        : 'No registrations found.'}
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredRegistrations.length > 0 && (
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
                <span>of {filteredRegistrations.length} registrations</span>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this registration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <ButtonLoading className="mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
