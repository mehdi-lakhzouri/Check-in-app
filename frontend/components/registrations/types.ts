// =============================================================================
// Registration Types
// =============================================================================

import type { Registration, Participant, Session } from '@/lib/schemas';

/**
 * Registration with populated participant and session
 */
export interface PopulatedRegistration extends Omit<Registration, 'participantId' | 'sessionId'> {
  participantId: Participant;
  sessionId: Session;
}

/**
 * Registration search parameters
 */
export interface RegistrationSearchParams {
  search?: string;
  sessionId?: string;
  organization?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * Registration filter state
 */
export interface RegistrationFilters {
  search: string;
  sessionId: string;
  organization: string;
  dateRange: DateRangePreset;
}

/**
 * Date range preset type
 */
export type DateRangePreset = 'all' | 'today' | 'week' | 'month';

/**
 * Custom date range
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Registration form data for create
 */
export interface CreateRegistrationData {
  participantId: string;
  sessionId: string;
}

/**
 * Bulk registration data
 */
export interface BulkRegistrationData {
  participantIds: string[];
  sessionId: string;
}

/**
 * Bulk registration result
 */
export interface BulkRegistrationResult {
  success: number;
  failed: number;
  errors: Array<{
    participantId: string;
    error: string;
  }>;
}

/**
 * Registration statistics
 */
export interface RegistrationStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  bySession: Array<{
    sessionId: string;
    sessionName: string;
    count: number;
  }>;
}

/**
 * Date range preset option
 */
export interface DateRangeOption {
  value: DateRangePreset;
  label: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

// =============================================================================
// Helper Functions
// =============================================================================

import { startOfDay, endOfDay, subWeeks, subMonths } from 'date-fns';

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return {
        start: today,
        end: endOfDay(now),
      };
    case 'week':
      return {
        start: subWeeks(today, 1),
        end: endOfDay(now),
      };
    case 'month':
      return {
        start: subMonths(today, 1),
        end: endOfDay(now),
      };
    case 'all':
    default:
      return {
        start: null,
        end: null,
      };
  }
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  if (!range.start || !range.end) return true;
  return date >= range.start && date <= range.end;
}
