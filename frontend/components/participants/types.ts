// =============================================================================
// Participant Types
// =============================================================================

import type { Participant } from '@/lib/schemas';

/**
 * Paginated participant search result
 */
export interface ParticipantSearchResult {
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
 * Participant search parameters
 */
export interface ParticipantSearchParams {
  search?: string;
  status?: string;
  role?: string;
  organization?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Participant filter state
 */
export interface ParticipantFilters {
  search: string;
  status: string;
  role: string;
  organization: string;
}

/**
 * Participant form data for create/update
 */
export interface ParticipantFormData {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  role?: string;
  isActive?: boolean;
  isAmbassador?: boolean;
  travelGrantApplied?: boolean;
}

/**
 * Bulk upload result
 */
export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    email?: string;
    error: string;
  }>;
}

/**
 * Participant stats for dashboard
 */
export interface ParticipantStats {
  total: number;
  active: number;
  inactive: number;
  ambassadors: number;
  travelGrantApplicants: number;
}

/**
 * Participant role option
 */
export interface ParticipantRoleOption {
  value: string;
  label: string;
}

export const PARTICIPANT_ROLES: ParticipantRoleOption[] = [
  { value: 'participant', label: 'Participant' },
  { value: 'speaker', label: 'Speaker' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'sponsor', label: 'Sponsor' },
];

/**
 * Participant status option
 */
export interface ParticipantStatusOption {
  value: string;
  label: string;
}

export const PARTICIPANT_STATUSES: ParticipantStatusOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/**
 * Sort options for participants
 */
export interface ParticipantSortOption {
  value: string;
  label: string;
}

export const PARTICIPANT_SORT_OPTIONS: ParticipantSortOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'organization', label: 'Organization' },
  { value: 'createdAt', label: 'Date Added' },
];
