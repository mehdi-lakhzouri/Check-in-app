'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Users,
  Building2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  UserPlus,
  CalendarDays,
  Info,
  Hash,
  ChevronsUpDown,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Participant, Session, Registration } from '@/lib/schemas';

// ============================================================================
// Types
// ============================================================================

interface ParticipantsByOrg {
  organization: string;
  participants: Participant[];
  selectedCount: number;
  totalCount: number;
  firstLetter: string;
}

interface BulkRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: Session[];
  participants: Participant[];
  existingRegistrations: Registration[];
  onSubmit: (sessionId: string, participantIds: string[]) => Promise<void>;
  isSubmitting?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const UNASSIGNED_ORG = 'No Organization';
const ORG_HEADER_HEIGHT = 52;
const PARTICIPANT_ROW_HEIGHT = 56;

// ============================================================================
// Component
// ============================================================================

export function BulkRegistrationDialog({
  open,
  onOpenChange,
  sessions,
  participants,
  existingRegistrations,
  onSubmit,
  isSubmitting = false,
}: BulkRegistrationDialogProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [showOnlyUnregistered, setShowOnlyUnregistered] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Derived State
  // ============================================================================

  // Get participants already registered for selected session
  const registeredParticipantIds = useMemo(() => {
    if (!selectedSessionId) return new Set<string>();
    return new Set(
      existingRegistrations
        .filter((r) => {
          const sessionId = typeof r.sessionId === 'object' && r.sessionId?._id
            ? r.sessionId._id
            : r.sessionId;
          return sessionId === selectedSessionId;
        })
        .map((r) => {
          const participantId = typeof r.participantId === 'object' && r.participantId?._id
            ? r.participantId._id
            : r.participantId;
          return participantId as string;
        })
    );
  }, [selectedSessionId, existingRegistrations]);

  // Filter participants based on search and registration status
  const filteredParticipants = useMemo(() => {
    let filtered = participants;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          (p.organization?.toLowerCase().includes(query) ?? false)
      );
    }

    // Optionally filter out already registered
    if (showOnlyUnregistered && selectedSessionId) {
      filtered = filtered.filter((p) => !registeredParticipantIds.has(p._id));
    }

    return filtered;
  }, [participants, searchQuery, showOnlyUnregistered, selectedSessionId, registeredParticipantIds]);

  // Group participants by organization
  const participantsByOrg = useMemo((): ParticipantsByOrg[] => {
    const orgMap = new Map<string, Participant[]>();

    filteredParticipants.forEach((participant) => {
      const org = participant.organization?.trim() || UNASSIGNED_ORG;
      if (!orgMap.has(org)) {
        orgMap.set(org, []);
      }
      orgMap.get(org)!.push(participant);
    });

    // Sort organizations alphabetically, but put "No Organization" at the end
    const sortedOrgs = Array.from(orgMap.entries())
      .sort(([a], [b]) => {
        if (a === UNASSIGNED_ORG) return 1;
        if (b === UNASSIGNED_ORG) return -1;
        return a.localeCompare(b);
      })
      .map(([organization, orgParticipants]) => ({
        organization,
        participants: orgParticipants.sort((a, b) => a.name.localeCompare(b.name)),
        selectedCount: orgParticipants.filter((p) => selectedParticipants.has(p._id)).length,
        totalCount: orgParticipants.length,
        firstLetter: organization === UNASSIGNED_ORG ? '#' : organization.charAt(0).toUpperCase(),
      }));

    return sortedOrgs;
  }, [filteredParticipants, selectedParticipants]);

  // Get unique alphabet letters for quick jump
  const alphabetIndex = useMemo(() => {
    const letters = new Map<string, number>();
    participantsByOrg.forEach((org, index) => {
      if (!letters.has(org.firstLetter)) {
        letters.set(org.firstLetter, index);
      }
    });
    return letters;
  }, [participantsByOrg]);

  // Count stats
  const stats = useMemo(() => {
    const totalFiltered = filteredParticipants.length;
    const totalSelected = selectedParticipants.size;
    const alreadyRegistered = registeredParticipantIds.size;
    const newRegistrations = Array.from(selectedParticipants).filter(
      (id) => !registeredParticipantIds.has(id)
    ).length;

    return { totalFiltered, totalSelected, alreadyRegistered, newRegistrations };
  }, [filteredParticipants, selectedParticipants, registeredParticipantIds]);

  // Selected session info
  const selectedSession = useMemo(() => {
    return sessions.find((s) => s._id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  // ============================================================================
  // Virtualization
  // ============================================================================
  
  // Flatten items for virtualization (org headers + participant rows)
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: 'org-header'; org: ParticipantsByOrg }
      | { type: 'participant'; participant: Participant; orgName: string }
    > = [];

    participantsByOrg.forEach((org) => {
      items.push({ type: 'org-header', org });
      
      const isExpanded = expandAll || expandedOrgs.has(org.organization);
      if (isExpanded) {
        org.participants.forEach((participant) => {
          items.push({ type: 'participant', participant, orgName: org.organization });
        });
      }
    });

    return items;
  }, [participantsByOrg, expandedOrgs, expandAll]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is designed this way
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const item = flatItems[index];
      return item.type === 'org-header' ? ORG_HEADER_HEIGHT : PARTICIPANT_ROW_HEIGHT;
    },
    overscan: 10,
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSelectedSessionId('');
        setSelectedParticipants(new Set());
        setSearchQuery('');
        setExpandedOrgs(new Set());
        setExpandAll(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Auto-expand first few organizations when session is selected
  useEffect(() => {
    if (selectedSessionId && participantsByOrg.length > 0) {
      const initialExpanded = new Set(
        participantsByOrg.slice(0, 3).map((g) => g.organization)
      );
      setExpandedOrgs(initialExpanded);
    }
  }, [selectedSessionId, participantsByOrg]);

  // Focus search input when session is selected
  useEffect(() => {
    if (selectedSessionId && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedSessionId]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, []);

  const toggleParticipant = useCallback((participantId: string, participantName: string) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
        announce(`${participantName} removed from selection`);
      } else {
        next.add(participantId);
        announce(`${participantName} added to selection`);
      }
      return next;
    });
  }, [announce]);

  const toggleOrganization = useCallback((org: ParticipantsByOrg) => {
    const orgParticipantIds = org.participants.map((p) => p._id);
    const allSelected = orgParticipantIds.every((id) => selectedParticipants.has(id));

    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        orgParticipantIds.forEach((id) => next.delete(id));
        announce(`All participants from ${org.organization} removed from selection`);
      } else {
        orgParticipantIds.forEach((id) => next.add(id));
        announce(`All participants from ${org.organization} added to selection`);
      }
      return next;
    });
  }, [selectedParticipants, announce]);

  const toggleOrgExpanded = useCallback((orgName: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgName)) {
        next.delete(orgName);
      } else {
        next.add(orgName);
      }
      return next;
    });
    setExpandAll(false);
  }, []);

  const selectAll = useCallback(() => {
    const allIds = filteredParticipants.map((p) => p._id);
    setSelectedParticipants(new Set(allIds));
    announce(`Selected all ${allIds.length} participants`);
  }, [filteredParticipants, announce]);

  const deselectAll = useCallback(() => {
    setSelectedParticipants(new Set());
    announce('Cleared all selections');
  }, [announce]);

  const handleSubmit = useCallback(async () => {
    if (!selectedSessionId || selectedParticipants.size === 0) return;

    const newParticipantIds = Array.from(selectedParticipants).filter(
      (id) => !registeredParticipantIds.has(id)
    );

    if (newParticipantIds.length === 0) {
      announce('All selected participants are already registered');
      return;
    }

    await onSubmit(selectedSessionId, newParticipantIds);
  }, [selectedSessionId, selectedParticipants, registeredParticipantIds, onSubmit, announce]);

  const scrollToLetter = useCallback((letter: string) => {
    const index = alphabetIndex.get(letter);
    if (index !== undefined && virtualizer) {
      virtualizer.scrollToIndex(index, { align: 'start' });
      announce(`Jumped to organizations starting with ${letter}`);
    }
  }, [alphabetIndex, virtualizer, announce]);

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setExpandedOrgs(new Set(participantsByOrg.map((o) => o.organization)));
    announce('Expanded all organizations');
  }, [participantsByOrg, announce]);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setExpandedOrgs(new Set());
    announce('Collapsed all organizations');
  }, [announce]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const isOrgFullySelected = (org: ParticipantsByOrg) => {
    return org.participants.every((p) => selectedParticipants.has(p._id));
  };

  const isOrgPartiallySelected = (org: ParticipantsByOrg) => {
    const selectedCount = org.participants.filter((p) => selectedParticipants.has(p._id)).length;
    return selectedCount > 0 && selectedCount < org.participants.length;
  };

  const renderVirtualItem = (item: typeof flatItems[number]) => {
    if (item.type === 'org-header') {
      const org = item.org;
      const isExpanded = expandAll || expandedOrgs.has(org.organization);
      const fullySelected = isOrgFullySelected(org);
      const partiallySelected = isOrgPartiallySelected(org);
      const hasSelectableParticipants = org.participants.some(
        (p) => !registeredParticipantIds.has(p._id)
      );

      return (
        <div
          key={`org-${org.organization}`}
          className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b sticky top-0 z-10"
          style={{ height: ORG_HEADER_HEIGHT }}
        >
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => toggleOrgExpanded(org.organization)}
            aria-label={isExpanded ? `Collapse ${org.organization}` : `Expand ${org.organization}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          {/* Select All Checkbox for Org */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <Checkbox
                    checked={fullySelected}
                    data-state={partiallySelected ? 'indeterminate' : fullySelected ? 'checked' : 'unchecked'}
                    onCheckedChange={() => toggleOrganization(org)}
                    disabled={!hasSelectableParticipants}
                    aria-label={`Select all participants from ${org.organization}`}
                    className={cn(
                      partiallySelected && 'data-[state=indeterminate]:bg-primary/50'
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{fullySelected ? 'Deselect all' : 'Select all'} from {org.organization}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Organization Icon */}
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />

          {/* Organization Name - Full width with tooltip for long names */}
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleOrgExpanded(org.organization)}
                  className="flex-1 text-left font-medium text-sm truncate min-w-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  {org.organization}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                <p className="font-medium">{org.organization}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {org.totalCount} participant{org.totalCount !== 1 ? 's' : ''}
                  {org.selectedCount > 0 && ` • ${org.selectedCount} selected`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Count Badge */}
          <Badge variant="secondary" className="shrink-0 tabular-nums text-xs">
            {org.selectedCount > 0 && (
              <span className="text-primary font-semibold">{org.selectedCount}/</span>
            )}
            {org.totalCount}
          </Badge>
        </div>
      );
    }

    // Participant Row
    const { participant } = item;
    const isRegistered = registeredParticipantIds.has(participant._id);
    const isSelected = selectedParticipants.has(participant._id);

    return (
      <div
        key={participant._id}
        className={cn(
          'flex items-center gap-3 px-4 py-2 border-b transition-colors',
          isRegistered 
            ? 'bg-muted/20 opacity-60' 
            : 'hover:bg-accent/50 cursor-pointer',
          isSelected && !isRegistered && 'bg-primary/5 border-l-2 border-l-primary'
        )}
        style={{ height: PARTICIPANT_ROW_HEIGHT }}
        onClick={isRegistered ? undefined : () => toggleParticipant(participant._id, participant.name)}
        onKeyDown={(e) => {
          if (!isRegistered && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleParticipant(participant._id, participant.name);
          }
        }}
        role="option"
        aria-selected={isSelected}
        aria-disabled={isRegistered}
        tabIndex={isRegistered ? -1 : 0}
      >
        {/* Checkbox or Registered Indicator */}
        <div className="shrink-0 ml-8">
          {isRegistered ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <CheckCircle2 
                      className="h-5 w-5 text-green-600" 
                      aria-label="Already registered"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Already registered for this session</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleParticipant(participant._id, participant.name)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${participant.name}`}
              className="h-5 w-5"
            />
          )}
        </div>

        {/* Participant Info - Full width */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    'font-medium text-sm truncate block',
                    isRegistered && 'line-through'
                  )}>
                    {participant.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p className="font-medium">{participant.name}</p>
                  <p className="text-xs text-muted-foreground">{participant.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isRegistered && (
              <Badge variant="outline" className="text-xs shrink-0 bg-green-500/10 text-green-700 border-green-500/30">
                Registered
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {participant.email}
          </p>
        </div>

        {/* Selection Indicator */}
        {!isRegistered && (
          <div className="shrink-0">
            {isSelected ? (
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/30" aria-hidden="true" />
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl h-[85vh] max-h-[700px] flex flex-col p-0 gap-0"
        aria-describedby="bulk-registration-description"
      >
        {/* Screen reader announcer */}
        <div
          ref={announcerRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Header - Fixed */}
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            Bulk Registration
          </DialogTitle>
          <DialogDescription id="bulk-registration-description" className="text-sm">
            Select a session first, then choose participants to register.
          </DialogDescription>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Step 1: Session Selection - Fixed */}
          <div className="px-5 py-3 border-b bg-muted/30 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="session-select" className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Session
                </Label>
                <Select
                  value={selectedSessionId}
                  onValueChange={(value) => {
                    setSelectedSessionId(value);
                    setSelectedParticipants(new Set());
                    announce(`Session selected: ${sessions.find((s) => s._id === value)?.name}`);
                  }}
                >
                  <SelectTrigger 
                    id="session-select" 
                    className="w-full bg-background h-9"
                    aria-label="Select a session"
                  >
                    <SelectValue placeholder="Choose a session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session._id} value={session._id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{session.name}</span>
                          {session.isOpen && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 shrink-0">
                              Open
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSession && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{registeredParticipantIds.size} registered</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Participant Selection */}
          {selectedSessionId ? (
            <>
              {/* Search and Actions Bar - Fixed */}
              <div className="px-5 py-3 border-b bg-background shrink-0 space-y-3">
                {/* Search Row */}
                <div className="flex gap-2">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search 
                      className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" 
                      aria-hidden="true" 
                    />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search name, email, organization..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-8 h-9 bg-background text-sm"
                      aria-label="Search participants"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>

                  {/* Quick Jump to Letter */}
                  {alphabetIndex.size > 5 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
                          <Hash className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">A-Z</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-auto">
                        <DropdownMenuLabel className="text-xs">Jump to letter</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="grid grid-cols-6 gap-1 p-2">
                          {Array.from(alphabetIndex.keys()).map((letter) => (
                            <Button
                              key={letter}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 font-medium"
                              onClick={() => scrollToLetter(letter)}
                            >
                              {letter}
                            </Button>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {/* Hide registered toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showOnlyUnregistered}
                      onCheckedChange={(checked) => setShowOnlyUnregistered(checked === true)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">Hide registered</span>
                  </label>

                  <div className="flex-1" />

                  {/* Stats */}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {stats.totalSelected} / {stats.totalFiltered} selected
                  </span>

                  {/* Expand/Collapse All */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExpandAll}>
                        Expand all
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCollapseAll}>
                        Collapse all
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Select/Clear All */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={selectAll}
                    disabled={filteredParticipants.length === 0}
                  >
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={deselectAll}
                    disabled={selectedParticipants.size === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Virtualized Participants List */}
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-auto min-h-0"
                role="listbox"
                aria-label="Participants grouped by organization"
              >
                {flatItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mb-3 opacity-40" aria-hidden="true" />
                    <p className="font-medium">No participants found</p>
                    <p className="text-sm text-center px-4 mt-1">
                      {searchQuery
                        ? 'Try adjusting your search criteria'
                        : 'No participants available'}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const item = flatItems[virtualItem.index];
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          {renderVirtualItem(item)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State - No Session Selected */
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground max-w-xs px-4">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
                <h3 className="font-medium mb-1">Select a Session</h3>
                <p className="text-sm">
                  Choose a session above to view and select participants.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <DialogFooter className="px-5 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex flex-col sm:flex-row w-full gap-3 sm:items-center">
            {/* Summary */}
            <div className="flex-1 text-xs">
              {selectedSessionId && stats.newRegistrations > 0 && (
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{stats.newRegistrations}</strong> new
                  {stats.totalSelected !== stats.newRegistrations && (
                    <span className="text-amber-600 ml-1">
                      ({stats.totalSelected - stats.newRegistrations} already registered)
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={
                  !selectedSessionId ||
                  stats.newRegistrations === 0 ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Register {stats.newRegistrations > 0 ? stats.newRegistrations : ''} Participant{stats.newRegistrations !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
