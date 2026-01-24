// Session types and interfaces

export type SortField = 'name' | 'startTime' | 'endTime' | 'isOpen' | 'checkInsCount' | 'createdAt';
export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'all' | 'open' | 'closed';
export type TimeFilter = 'all' | 'today' | 'upcoming' | 'past' | 'thisWeek' | 'thisMonth';
export type CapacityFilter = 'all' | 'available' | 'full' | 'noLimit';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface SessionFormData {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  isOpen: boolean;
  capacity: number | undefined;
  requiresRegistration: boolean;
  // Per-session timing configuration (optional - falls back to global defaults)
  autoOpenMinutesBefore: number | undefined;
  autoEndGraceMinutes: number | undefined;
  lateThresholdMinutes: number | undefined;
}

export interface BulkSessionEntry {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  isOpen: boolean;
  capacity: number | undefined;
  requiresRegistration: boolean;
  // Per-session timing configuration (optional - falls back to global defaults)
  autoOpenMinutesBefore: number | undefined;
  autoEndGraceMinutes: number | undefined;
  lateThresholdMinutes: number | undefined;
}

export type WizardStep = 'method' | 'entries' | 'review';

export interface WizardState {
  currentStep: WizardStep;
  method: 'manual' | 'import' | null;
  sessions: BulkSessionEntry[];
}
