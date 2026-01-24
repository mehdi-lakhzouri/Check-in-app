// =============================================================================
// Check-ins Module Types
// =============================================================================

import type { CheckIn, Participant, Session } from '@/lib/schemas';

/**
 * Check-in with populated participant and session data
 */
export interface PopulatedCheckIn extends Omit<CheckIn, 'participantId' | 'sessionId'> {
  participantId: Participant;
  sessionId: Session;
}

/**
 * Date filter options for check-ins
 */
export type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth';

/**
 * Check-in method types
 */
export type CheckInMethod = 'qr' | 'manual';

/**
 * Check-in status types
 */
export type CheckInStatus = 'ontime' | 'late';

/**
 * Check-in statistics
 */
export interface CheckInStats {
  total: number;
  qr: number;
  manual: number;
  late: number;
  onTime: number;
  todayCount: number;
}

/**
 * Check-in search/filter parameters
 */
export interface CheckInSearchParams {
  search?: string;
  sessionId?: string;
  method?: CheckInMethod;
  status?: CheckInStatus;
  dateFilter?: DateFilter;
  page?: number;
  limit?: number;
}
