// =============================================================================
// Ambassador API Functions
// =============================================================================

import { api } from '@/lib/api/client';
import type { Participant, ApiResponse } from '@/lib/schemas';
import type {
  AmbassadorSearchResult,
  AmbassadorDetails,
  AmbassadorSearchParams,
  SyncReferralsResponse,
  SyncAllReferralsResponse,
} from './types';

/**
 * Ambassador API client
 * Provides all ambassador-related API operations
 */
export const ambassadorApi = {
  /**
   * Search ambassadors with pagination and filtering
   */
  search: async (params: AmbassadorSearchParams): Promise<AmbassadorSearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set('search', params.search);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const res = await api.get<
      ApiResponse<Participant[]> & { meta: AmbassadorSearchResult['meta'] }
    >(`/participants/ambassadors/search?${queryParams.toString()}`);
    return { data: res.data, meta: res.meta };
  },

  /**
   * Get detailed information about an ambassador
   */
  getDetails: async (id: string): Promise<AmbassadorDetails> => {
    const res = await api.get<ApiResponse<AmbassadorDetails>>(
      `/participants/${id}/ambassador/details`
    );
    return res.data;
  },

  /**
   * Promote a participant to ambassador status
   */
  promote: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/promote`
    );
    return res.data;
  },

  /**
   * Demote an ambassador to regular participant
   */
  demote: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/demote`
    );
    return res.data;
  },

  /**
   * Add a referral to an ambassador
   */
  addReferral: async (
    ambassadorId: string,
    participantId: string
  ): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${ambassadorId}/ambassador/add-referred`,
      { participantId }
    );
    return res.data;
  },

  /**
   * Remove a referral from an ambassador
   */
  removeReferral: async (
    ambassadorId: string,
    participantId: string
  ): Promise<Participant> => {
    const res = await api.delete<ApiResponse<Participant>>(
      `/participants/${ambassadorId}/ambassador/remove-referred/${participantId}`
    );
    return res.data;
  },

  /**
   * Calculate points for an ambassador
   */
  calculatePoints: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/calculate-points`
    );
    return res.data;
  },

  /**
   * Sync referrals for a single ambassador
   */
  syncReferrals: async (id: string): Promise<SyncReferralsResponse> => {
    const res = await api.post<ApiResponse<SyncReferralsResponse>>(
      `/participants/${id}/ambassador/sync-referrals`
    );
    return res.data;
  },

  /**
   * Sync referrals for all ambassadors
   */
  syncAllReferrals: async (): Promise<SyncAllReferralsResponse> => {
    const res = await api.post<ApiResponse<SyncAllReferralsResponse>>(
      `/participants/ambassadors/sync-all-referrals`
    );
    return res.data;
  },

  /**
   * Get ambassador leaderboard
   */
  getLeaderboard: async (limit = 10): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>(
      `/participants/ambassadors/leaderboard?limit=${limit}`
    );
    return res.data;
  },

  /**
   * Search participants (for adding referrals)
   */
  searchParticipants: async (search: string): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>(
      `/participants?search=${encodeURIComponent(search)}&limit=20`
    );
    return res.data;
  },
};

export default ambassadorApi;
