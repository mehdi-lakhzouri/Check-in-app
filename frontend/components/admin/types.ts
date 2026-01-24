// =============================================================================
// Admin Module Types
// =============================================================================

import type { Participant } from '@/lib/schemas';

/**
 * Ambassador leaderboard item
 */
export interface AmbassadorLeaderboardItem {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  ambassadorPoints: number;
  referredParticipantIds: string[];
  rank?: number;
}

/**
 * Travel grant application
 */
export interface TravelGrantApplication {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  travelGrantApproved: boolean | null;
  travelGrantAppliedAt?: string;
}

/**
 * Referred participant info
 */
export interface ReferredParticipantInfo {
  _id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

/**
 * Ambassador activity data
 */
export interface AmbassadorActivity {
  participant: Participant;
  totalPoints: number;
  referredParticipants: ReferredParticipantInfo[];
}

/**
 * Admin dashboard participant stats
 */
export interface ParticipantStats {
  total: number;
  active: number;
  ambassadors: number;
  travelGrant: number;
}

/**
 * Travel grant stats
 */
export interface TravelGrantStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}
