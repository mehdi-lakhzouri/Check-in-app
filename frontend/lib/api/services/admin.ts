/**
 * Admin API Service - Type-safe API calls for admin dashboard
 * Handles Ambassador and Travel Grant management
 */

import { api } from '../client';
import type { ApiResponse, Participant } from '@/lib/schemas';

// ============================================================================
// Types
// ============================================================================

export interface AmbassadorLeaderboardItem {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  ambassadorPoints: number;
  referredParticipantIds: string[];
  rank?: number;
}

export interface AmbassadorActivity {
  participant: Participant;
  referredParticipants: Array<{
    _id: string;
    name: string;
    email: string;
    organization?: string;
    status: string;
    createdAt: string;
  }>;
  totalPoints: number;
}

export interface TravelGrantApplication {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  travelGrantApplied: boolean;
  travelGrantApproved: boolean | null;
  travelGrantAppliedAt?: string;
  travelGrantDecidedAt?: string;
  status: string;
  createdAt: string;
}

export interface TravelGrantStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface TravelGrantQualification {
  qualified: boolean;
  reason?: string;
}

export interface ParticipantStats {
  total: number;
  active: number;
  ambassadors: number;
  travelGrant: number;
}

export interface TravelGrantApplicationFilters {
  status?: boolean;
  organization?: string;
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// Admin Service
// ============================================================================

export const adminService = {
  // ==========================================================================
  // Ambassador Methods
  // ==========================================================================

  /**
   * Get ambassador leaderboard sorted by points
   */
  getAmbassadorLeaderboard: async (limit = 10): Promise<AmbassadorLeaderboardItem[]> => {
    const res = await api.get<ApiResponse<AmbassadorLeaderboardItem[]>>(
      '/participants/ambassadors/leaderboard',
      { limit }
    );
    // Add rank to each ambassador
    return res.data.map((ambassador, index) => ({
      ...ambassador,
      rank: index + 1,
    }));
  },

  /**
   * Get ambassador activity including referred participants
   */
  getAmbassadorActivity: async (id: string): Promise<AmbassadorActivity> => {
    const res = await api.get<ApiResponse<AmbassadorActivity>>(
      `/participants/${id}/ambassador/activity`
    );
    return res.data;
  },

  /**
   * Calculate ambassador points (recalculate from referrals)
   */
  calculateAmbassadorPoints: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/ambassador/calculate-points`
    );
    return res.data;
  },

  /**
   * Add a referred participant to an ambassador
   */
  addReferredParticipant: async (
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
   * Remove a referred participant from an ambassador
   */
  removeReferredParticipant: async (
    ambassadorId: string,
    participantId: string
  ): Promise<Participant> => {
    const res = await api.delete<ApiResponse<Participant>>(
      `/participants/${ambassadorId}/ambassador/remove-referred/${participantId}`
    );
    return res.data;
  },

  // ==========================================================================
  // Travel Grant Methods
  // ==========================================================================

  /**
   * Get travel grant applications with optional filters
   */
  getTravelGrantApplications: async (
    filters?: TravelGrantApplicationFilters
  ): Promise<TravelGrantApplication[]> => {
    const res = await api.get<ApiResponse<TravelGrantApplication[]>>(
      '/participants/travel-grants/applications',
      filters
    );
    return res.data;
  },

  /**
   * Get travel grant statistics
   */
  getTravelGrantStats: async (): Promise<TravelGrantStats> => {
    const res = await api.get<ApiResponse<TravelGrantStats>>(
      '/participants/travel-grants/stats'
    );
    return res.data;
  },

  /**
   * Check if a participant qualifies for travel grant
   */
  checkTravelGrantQualification: async (id: string): Promise<TravelGrantQualification> => {
    const res = await api.get<ApiResponse<TravelGrantQualification>>(
      `/participants/${id}/travel-grant/qualification`
    );
    return res.data;
  },

  /**
   * Apply for travel grant on behalf of a participant
   */
  applyForTravelGrant: async (id: string): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/apply`
    );
    return res.data;
  },

  /**
   * Approve or reject a travel grant application
   */
  decideTravelGrant: async (id: string, approved: boolean): Promise<Participant> => {
    const res = await api.patch<ApiResponse<Participant>>(
      `/participants/${id}/travel-grant/decide`,
      { approved }
    );
    return res.data;
  },

  // ==========================================================================
  // Stats Methods
  // ==========================================================================

  /**
   * Get participant statistics
   */
  getParticipantStats: async (): Promise<ParticipantStats> => {
    const res = await api.get<ApiResponse<ParticipantStats>>('/participants/stats');
    return res.data;
  },
};
