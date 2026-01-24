'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, addHours, startOfHour } from 'date-fns';
import {
  Search,
  X,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  FileUp,
  FileSpreadsheet,
  Trash2,
  MapPin,
  Clock,
  Users,
  Info,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  UserCheck,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useBulkCreateSessions } from '@/lib/hooks/use-sessions';
import type { CreateSessionDto } from '@/lib/schemas';
import type { BulkCreateResult } from '@/lib/api/services/sessions';
import type { BulkSessionEntry } from './types';
import { parseCSV, rowsToBulkSessions, createEmptyBulkSession, validateBulkSessions } from './utils';

// ============================================================================
// Types
// ============================================================================

interface BulkSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SESSION_ROW_HEIGHT = 280;

// ============================================================================
// Helper Functions
// ============================================================================

function generateCSVTemplate(): string {
  const headers = ['name', 'description', 'startTime', 'endTime', 'location', 'capacity', 'isOpen', 'requiresRegistration'];
  const exampleDate = format(startOfHour(addHours(new Date(), 24)), 'yyyy-MM-dd HH:mm');
  const exampleEndDate = format(startOfHour(addHours(new Date(), 26)), 'yyyy-MM-dd HH:mm');
  const example = [
    'Opening Ceremony',
    'Welcome event for all participants',
    exampleDate,
    exampleEndDate,
    'Main Hall',
    '200',
    'false',
    'false',
  ];
  return `${headers.join(',')}\n${example.join(',')}`;
}

function downloadCSVTemplate() {
  const template = generateCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sessions_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Session Entry Card Component
// ============================================================================

interface SessionEntryCardProps {
  session: BulkSessionEntry;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, field: keyof BulkSessionEntry, value: unknown) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  validationErrors: string[];
}

function SessionEntryCard({
  session,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  isSelected,
  onToggleSelect,
  validationErrors,
}: SessionEntryCardProps) {
  const hasErrors = validationErrors.length > 0;

  return (
    <div
      className={cn(
        'border rounded-lg transition-all bg-background',
        isSelected && 'ring-2 ring-primary border-primary',
        hasErrors && 'border-destructive/50 bg-destructive/5'
      )}
    >
      {/* Header - Always Visible */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
          isExpanded && 'border-b'
        )}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`session-content-${session.id}`}
      >
        {/* Selection Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select session ${index + 1}`}
          className="shrink-0"
        />

        {/* Expand/Collapse Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse session' : 'Expand session'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        {/* Session Badge */}
        <Badge
          variant="secondary"
          className={cn('font-mono text-xs shrink-0', hasErrors && 'bg-destructive/20 text-destructive')}
        >
          #{index + 1}
        </Badge>

        {/* Session Info Preview */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="font-medium text-sm truncate">
            {session.name || 'Untitled Session'}
          </span>
          {session.location && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              <MapPin className="h-3 w-3 inline mr-1" />
              {session.location}
            </span>
          )}
          {session.isOpen && (
            <Badge variant="default" className="text-xs shrink-0 bg-green-600">
              Open
            </Badge>
          )}
          {session.requiresRegistration && (
            <Badge variant="outline" className="text-xs shrink-0">
              Reg. Required
            </Badge>
          )}
        </div>

        {/* Error Indicator */}
        {hasErrors && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <ul className="text-sm list-disc pl-3">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(session.id);
          }}
          aria-label={`Remove session ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Collapsible Content */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent id={`session-content-${session.id}`}>
          <div className="px-4 py-4 space-y-4">
            {/* Row 1: Name & Location */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${session.id}`} className="text-xs font-medium flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  Session Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`name-${session.id}`}
                  value={session.name}
                  onChange={(e) => onUpdate(session.id, 'name', e.target.value)}
                  placeholder="e.g., Opening Ceremony"
                  aria-required="true"
                  className={cn(!session.name && hasErrors && 'border-destructive')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`location-${session.id}`} className="text-xs font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  Location
                </Label>
                <Input
                  id={`location-${session.id}`}
                  value={session.location}
                  onChange={(e) => onUpdate(session.id, 'location', e.target.value)}
                  placeholder="e.g., Main Hall"
                />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="space-y-1.5">
              <Label htmlFor={`description-${session.id}`} className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id={`description-${session.id}`}
                value={session.description}
                onChange={(e) => onUpdate(session.id, 'description', e.target.value)}
                placeholder="Brief session description (optional)"
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* Row 3: Times & Capacity */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`startTime-${session.id}`} className="text-xs font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`startTime-${session.id}`}
                  type="datetime-local"
                  value={session.startTime}
                  onChange={(e) => onUpdate(session.id, 'startTime', e.target.value)}
                  aria-required="true"
                  className={cn(!session.startTime && hasErrors && 'border-destructive')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`endTime-${session.id}`} className="text-xs font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`endTime-${session.id}`}
                  type="datetime-local"
                  value={session.endTime}
                  onChange={(e) => onUpdate(session.id, 'endTime', e.target.value)}
                  aria-required="true"
                  className={cn(!session.endTime && hasErrors && 'border-destructive')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`capacity-${session.id}`} className="text-xs font-medium flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  Capacity
                </Label>
                <Input
                  id={`capacity-${session.id}`}
                  type="number"
                  min={0}
                  value={session.capacity ?? ''}
                  onChange={(e) =>
                    onUpdate(session.id, 'capacity', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="∞ (unlimited)"
                />
              </div>
            </div>

            {/* Row 4: Toggles */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id={`isOpen-${session.id}`}
                  checked={session.isOpen}
                  onCheckedChange={(checked) => onUpdate(session.id, 'isOpen', checked)}
                  aria-describedby={`isOpen-desc-${session.id}`}
                />
                <Label
                  htmlFor={`isOpen-${session.id}`}
                  className="text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <DoorOpen className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  Open for check-in
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`requiresReg-${session.id}`}
                  checked={session.requiresRegistration}
                  onCheckedChange={(checked) => onUpdate(session.id, 'requiresRegistration', checked)}
                  aria-describedby={`requiresReg-desc-${session.id}`}
                />
                <Label
                  htmlFor={`requiresReg-${session.id}`}
                  className="text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <UserCheck className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  Requires registration
                </Label>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BulkSessionsDialog({ open, onOpenChange }: BulkSessionsDialogProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [sessions, setSessions] = useState<BulkSessionEntry[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Map<string, string[]>>(new Map());
  const [bulkResult, setBulkResult] = useState<BulkCreateResult | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Mutation
  // ============================================================================

  const bulkCreateMutation = useBulkCreateSessions({
    onSuccess: (result) => {
      setBulkResult(result);
      if (result.success > 0 && result.failed === 0) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    },
  });

  // ============================================================================
  // Derived State
  // ============================================================================

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.location.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: sessions.length,
      filtered: filteredSessions.length,
      selected: selectedSessions.size,
      valid: sessions.filter((s) => !validationErrors.has(s.id) || validationErrors.get(s.id)?.length === 0).length,
    };
  }, [sessions, filteredSessions, selectedSessions, validationErrors]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSessions([]);
        setSelectedSessions(new Set());
        setExpandedSessions(new Set());
        setSearchQuery('');
        setFileError(null);
        setValidationErrors(new Map());
        setBulkResult(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Validate sessions whenever they change
  useEffect(() => {
    const errors = new Map<string, string[]>();
    sessions.forEach((s) => {
      const sessionErrors: string[] = [];
      if (!s.name.trim()) sessionErrors.push('Name is required');
      if (!s.startTime) sessionErrors.push('Start time is required');
      if (!s.endTime) sessionErrors.push('End time is required');
      if (s.startTime && s.endTime && new Date(s.startTime) >= new Date(s.endTime)) {
        sessionErrors.push('End time must be after start time');
      }
      if (sessionErrors.length > 0) {
        errors.set(s.id, sessionErrors);
      }
    });
    setValidationErrors(errors);
  }, [sessions]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, []);

  const handleClose = () => {
    onOpenChange(false);
  };

  const addSession = useCallback(() => {
    const newSession = createEmptyBulkSession(sessions.length);
    setSessions((prev) => [...prev, newSession]);
    setExpandedSessions((prev) => new Set(prev).add(newSession.id));
    announce(`Session ${sessions.length + 1} added`);
  }, [sessions.length, announce]);

  const updateSession = useCallback((id: string, field: keyof BulkSessionEntry, value: unknown) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const removeSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSelectedSessions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpandedSessions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      announce('Session removed');
    },
    [announce]
  );

  const removeSelected = useCallback(() => {
    const count = selectedSessions.size;
    setSessions((prev) => prev.filter((s) => !selectedSessions.has(s.id)));
    setSelectedSessions(new Set());
    announce(`${count} session${count !== 1 ? 's' : ''} removed`);
  }, [selectedSessions, announce]);

  const toggleSessionExpand = useCallback((id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSessionSelect = useCallback((id: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSessions(new Set(filteredSessions.map((s) => s.id)));
    announce(`Selected all ${filteredSessions.length} sessions`);
  }, [filteredSessions, announce]);

  const deselectAll = useCallback(() => {
    setSelectedSessions(new Set());
    announce('Cleared all selections');
  }, [announce]);

  const expandAll = useCallback(() => {
    setExpandedSessions(new Set(sessions.map((s) => s.id)));
    announce('Expanded all sessions');
  }, [sessions, announce]);

  const collapseAll = useCallback(() => {
    setExpandedSessions(new Set());
    announce('Collapsed all sessions');
  }, [announce]);

  // File handling
  const handleFileRead = useCallback(
    (file: File) => {
      setFileError(null);

      const validExtensions = ['.csv'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        setFileError('Please upload a CSV file (.csv)');
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const rows = parseCSV(content);
          if (rows.length < 2) {
            setFileError('The file appears to be empty or has no data rows.');
            return;
          }
          const importedSessions = rowsToBulkSessions(rows, true);
          setSessions((prev) => [...prev, ...importedSessions]);
          // Expand imported sessions
          setExpandedSessions((prev) => {
            const next = new Set(prev);
            importedSessions.forEach((s) => next.add(s.id));
            return next;
          });
          announce(`Imported ${importedSessions.length} sessions from file`);
        } catch (err) {
          setFileError("Failed to parse the file. Please ensure it's a valid CSV file.");
          console.error('File parse error:', err);
        }
      };

      reader.onerror = () => {
        setFileError('Failed to read the file. Please try again.');
      };

      reader.readAsText(file);
    },
    [announce]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileRead(files[0]);
      }
    },
    [handleFileRead]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileRead(files[0]);
      }
      e.target.value = '';
    },
    [handleFileRead]
  );

  const handleSubmit = useCallback(() => {
    if (sessions.length === 0) return;

    // Check for validation errors
    if (validationErrors.size > 0) {
      announce('Please fix validation errors before submitting');
      return;
    }

    const sessionsData: CreateSessionDto[] = sessions.map((s) => ({
      name: s.name.trim(),
      description: s.description.trim() || undefined,
      startTime: new Date(s.startTime).toISOString(),
      endTime: new Date(s.endTime).toISOString(),
      location: s.location.trim() || undefined,
      isOpen: s.isOpen,
      capacity: s.capacity,
      requiresRegistration: s.requiresRegistration,
    }));

    bulkCreateMutation.mutate({ sessions: sessionsData });
  }, [sessions, validationErrors, bulkCreateMutation, announce]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl h-[85vh] max-h-[800px] flex flex-col p-0 gap-0"
        aria-describedby="bulk-sessions-description"
      >
        {/* Screen reader announcer */}
        <div ref={announcerRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            Bulk Create Sessions
          </DialogTitle>
          <DialogDescription id="bulk-sessions-description" className="text-sm">
            Add multiple sessions at once. Import from CSV or add manually.
          </DialogDescription>
        </DialogHeader>

        {/* Alerts */}
        {bulkResult && (
          <Alert
            variant={bulkResult.failed > 0 ? 'destructive' : 'default'}
            className="mx-5 mt-4 shrink-0"
          >
            <div className="flex items-center gap-2">
              {bulkResult.failed === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <div>
                <p className="font-medium">
                  {bulkResult.success} session(s) created successfully
                  {bulkResult.failed > 0 && `, ${bulkResult.failed} failed`}
                </p>
                {bulkResult.errors.length > 0 && (
                  <ul className="text-sm mt-1 list-disc pl-4">
                    {bulkResult.errors.map((err, i) => (
                      <li key={i}>
                        Session &quot;{err.name || `#${err.index + 1}`}&quot;: {err.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Alert>
        )}

        {fileError && (
          <Alert variant="destructive" className="mx-5 mt-4 shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Actions Bar */}
          <div className="px-5 py-3 border-b bg-muted/30 shrink-0 space-y-3">
            {/* Row 1: Import & Add */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
                id="bulk-sessions-file-input"
                aria-label="Import sessions from CSV file"
              />
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <FileUp className="h-4 w-4" aria-hidden="true" />
                      Import CSV
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Import sessions from a CSV file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={downloadCSVTemplate} className="gap-2">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Template
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download CSV template</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex-1" />

              <Button variant="default" size="sm" onClick={addSession} className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Session
              </Button>
            </div>

            {/* Row 2: Search & Bulk Actions (only when sessions exist) */}
            {sessions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-8 bg-background text-sm"
                    aria-label="Search sessions"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
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

                {/* Stats */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {stats.selected > 0 && <span className="text-primary font-medium">{stats.selected} selected • </span>}
                  {stats.total} session{stats.total !== 1 ? 's' : ''}
                  {validationErrors.size > 0 && (
                    <span className="text-destructive ml-1">• {validationErrors.size} with errors</span>
                  )}
                </span>

                {/* Bulk Actions */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={selectAll}>
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={deselectAll}
                    disabled={selectedSessions.size === 0}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={removeSelected}
                    disabled={selectedSessions.size === 0}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="border-l h-5" />

                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={expandAll}>
                  Expand
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={collapseAll}>
                  Collapse
                </Button>
              </div>
            )}
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1">
            <div
              className="p-5 space-y-3"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {sessions.length === 0 ? (
                /* Empty State / Drop Zone */
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center transition-colors min-h-[300px]',
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  )}
                >
                  <FileSpreadsheet
                    className={cn('h-16 w-16 mb-4 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <p className="text-lg font-semibold mb-2">
                    {isDragging ? 'Drop your file here' : 'No sessions added yet'}
                  </p>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Drag & drop a CSV file here, or use the buttons above to import or add sessions manually.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <FileUp className="h-4 w-4 mr-2" aria-hidden="true" />
                      Import CSV
                    </Button>
                    <Button onClick={addSession}>
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Add Session
                    </Button>
                  </div>
                </div>
              ) : filteredSessions.length === 0 ? (
                /* No Results */
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-40" aria-hidden="true" />
                  <p className="font-medium">No sessions found</p>
                  <p className="text-sm mt-1">Try adjusting your search query</p>
                </div>
              ) : (
                /* Session Cards */
                filteredSessions.map((session, index) => (
                  <SessionEntryCard
                    key={session.id}
                    session={session}
                    index={sessions.indexOf(session)}
                    isExpanded={expandedSessions.has(session.id)}
                    onToggleExpand={() => toggleSessionExpand(session.id)}
                    onUpdate={updateSession}
                    onRemove={removeSession}
                    isSelected={selectedSessions.has(session.id)}
                    onToggleSelect={() => toggleSessionSelect(session.id)}
                    validationErrors={validationErrors.get(session.id) || []}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex flex-col sm:flex-row w-full gap-3 sm:items-center">
            {/* Summary */}
            <div className="flex-1 text-xs">
              {sessions.length > 0 && (
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{sessions.length}</strong> session
                  {sessions.length !== 1 ? 's' : ''} to create
                  {validationErrors.size > 0 && (
                    <span className="text-destructive ml-1">
                      ({validationErrors.size} with errors - please fix before creating)
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={bulkCreateMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={sessions.length === 0 || validationErrors.size > 0 || bulkCreateMutation.isPending}
              >
                {bulkCreateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Create {sessions.length > 0 ? sessions.length : ''} Session{sessions.length !== 1 ? 's' : ''}
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
