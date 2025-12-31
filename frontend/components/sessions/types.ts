// Session types and interfaces

export type SortField = 'name' | 'startTime' | 'endTime' | 'isOpen' | 'checkInsCount' | 'createdAt';
export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'all' | 'open' | 'closed';

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
}

export type WizardStep = 'method' | 'entries' | 'review';

export interface WizardState {
  currentStep: WizardStep;
  method: 'manual' | 'import' | null;
  sessions: BulkSessionEntry[];
}
