// =============================================================================
// Travel Grant API Functions
// =============================================================================

import { api } from '@/lib/api/client';
import type { Participant, ApiResponse } from '@/lib/schemas';
import type {
  TravelGrantSearchResult,
  TravelGrantDetails,
  TravelGrantSearchParams,
  BulkDecisionResponse,
} from './types';

/**
 * Travel Grant API client
 * Provides all travel grant related API operations
 */
export const travelGrantApi = {
  /**
   * Search travel grant applicants with pagination and filtering
   */
  search: async (params: TravelGrantSearchParams): Promise<TravelGrantSearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set('search', params.search);
    if (params.status && params.status !== 'all') {
      queryParams.set('status', params.status);
    }
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const res = await api.get<
      ApiResponse<Participant[]> & { meta: TravelGrantSearchResult['meta'] }
    >(`/participants/travel-grants/search?${queryParams.toString()}`);
    return { data: res.data, meta: res.meta };
  },

  /**
   * Get detailed information about a travel grant applicant
   */
  getDetails: async (id: string): Promise<TravelGrantDetails> => {
    const res = await api.get<ApiResponse<TravelGrantDetails>>(
      `/participants/${id}/travel-grant/details`
    );
    return res.data;
  },

  /**
   * Approve a travel grant application
   */
  approve: async (id: string, notes?: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/approve`,
      { notes }
    );
    return res.data;
  },

  /**
   * Reject a travel grant application
   */
  reject: async (id: string, notes?: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/reject`,
      { notes }
    );
    return res.data;
  },

  /**
   * Reset travel grant decision (back to pending)
   */
  reset: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/reset`
    );
    return res.data;
  },

  /**
   * Bulk approve travel grants
   */
  bulkApprove: async (ids: string[]): Promise<BulkDecisionResponse> => {
    const res = await api.post<ApiResponse<BulkDecisionResponse>>(
      `/participants/travel-grants/bulk-approve`,
      { participantIds: ids }
    );
    return res.data;
  },

  /**
   * Bulk reject travel grants
   */
  bulkReject: async (ids: string[]): Promise<BulkDecisionResponse> => {
    const res = await api.post<ApiResponse<BulkDecisionResponse>>(
      `/participants/travel-grants/bulk-reject`,
      { participantIds: ids }
    );
    return res.data;
  },

  /**
   * Get travel grant statistics
   */
  getStats: async (): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> => {
    const res = await api.get<
      ApiResponse<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
      }>
    >(`/participants/travel-grants/stats`);
    return res.data;
  },

  /**
   * Get all travel grant applicants (for stats calculation)
   */
  getAll: async (): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>('/participants/travel-grants');
    return res.data;
  },
};

export default travelGrantApi;
