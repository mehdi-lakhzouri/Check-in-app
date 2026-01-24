// =============================================================================
// Travel Grant Types
// =============================================================================

import type { Participant } from '@/lib/schemas';

/**
 * Travel grant status
 */
export type TravelGrantStatus = 'pending' | 'approved' | 'rejected';

/**
 * Paginated travel grant search result
 */
export interface TravelGrantSearchResult {
  data: Participant[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Check-in record for a participant
 */
export interface CheckInRecord {
  _id: string;
  sessionId: string;
  sessionName: string;
  sessionLocation: string;
  checkInTime: string;
  method: 'qr' | 'manual';
  isLate: boolean;
}

/**
 * Detailed travel grant information
 */
export interface TravelGrantDetails {
  participant: Participant;
  checkInProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  lastCheckIns: CheckInRecord[];
  stats: {
    totalCheckIns: number;
    totalRegisteredSessions: number;
    applicationStatus: TravelGrantStatus;
    appliedAt?: string;
    decidedAt?: string;
  };
}

/**
 * Travel grant search parameters
 */
export interface TravelGrantSearchParams {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Travel grant filter state
 */
export interface TravelGrantFilters {
  search: string;
  status: string;
}

/**
 * Travel grant decision payload
 */
export interface TravelGrantDecision {
  participantId: string;
  approved: boolean;
  notes?: string;
}

/**
 * Bulk decision response
 */
export interface BulkDecisionResponse {
  processed: number;
  success: number;
  failed: number;
}

/**
 * Status filter option
 */
export interface TravelGrantStatusOption {
  value: string;
  label: string;
  icon: 'pending' | 'approved' | 'rejected' | 'all';
}

export const TRAVEL_GRANT_STATUS_OPTIONS: TravelGrantStatusOption[] = [
  { value: 'all', label: 'All Applicants', icon: 'all' },
  { value: 'pending', label: 'Pending', icon: 'pending' },
  { value: 'approved', label: 'Approved', icon: 'approved' },
  { value: 'rejected', label: 'Rejected', icon: 'rejected' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get travel grant status from participant
 */
export function getTravelGrantStatus(participant: Participant): TravelGrantStatus {
  if (participant.travelGrantApproved === true) return 'approved';
  if (participant.travelGrantApproved === false) return 'rejected';
  return 'pending';
}

/**
 * Get badge variant for status
 */
export function getStatusBadgeVariant(
  status: TravelGrantStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending':
    default:
      return 'secondary';
  }
}

/**
 * Format status for display
 */
export function formatStatus(status: TravelGrantStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
