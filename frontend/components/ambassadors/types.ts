// =============================================================================
// Ambassador Types
// =============================================================================

import type { Participant } from '@/lib/schemas';

/**
 * Paginated ambassador search result
 */
export interface AmbassadorSearchResult {
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
 * Detailed ambassador information including referred participants
 */
export interface AmbassadorDetails {
  ambassador: Participant;
  referredParticipants: ReferredParticipant[];
  stats: AmbassadorStats;
}

/**
 * A participant referred by an ambassador
 */
export interface ReferredParticipant {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  status: string;
  isActive: boolean;
}

/**
 * Ambassador statistics
 */
export interface AmbassadorStats {
  totalReferrals: number;
  activeReferrals: number;
  points: number;
}

/**
 * Ambassador search parameters
 */
export interface AmbassadorSearchParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Ambassador filter state
 */
export interface AmbassadorFilters {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Sync referrals response
 */
export interface SyncReferralsResponse {
  ambassador: Participant;
  addedCount: number;
  totalReferrals: number;
}

/**
 * Sync all referrals response
 */
export interface SyncAllReferralsResponse {
  processed: number;
  totalAdded: number;
}

/**
 * Column sort configuration
 */
export interface AmbassadorSortConfig {
  field: string;
  label: string;
}

export const AMBASSADOR_SORT_OPTIONS: AmbassadorSortConfig[] = [
  { field: 'ambassadorPoints', label: 'Points' },
  { field: 'name', label: 'Name' },
  { field: 'organization', label: 'Organization' },
  { field: 'createdAt', label: 'Date Joined' },
];
