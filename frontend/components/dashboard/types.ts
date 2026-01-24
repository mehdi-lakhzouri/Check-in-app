// =============================================================================
// Dashboard Module Types
// =============================================================================

import type { Session, CheckIn } from '@/lib/schemas';

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalParticipants: number;
  totalSessions: number;
  totalCheckIns: number;
  totalRegistrations: number;
}

/**
 * Recent session display
 */
export interface RecentSession extends Pick<Session, '_id' | 'name' | 'isOpen' | 'startTime' | 'endTime'> {}

/**
 * Recent check-in display
 */
export interface RecentCheckIn extends Pick<CheckIn, '_id' | 'checkInTime' | 'isLate' | 'method'> {}
