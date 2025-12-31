/**
 * Dashboard Hooks - TanStack Query hooks for dashboard statistics
 */

import {
  useQuery,
  useQueries,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { sessionsService } from '@/lib/api/services/sessions';
import { participantsService } from '@/lib/api/services/participants';
import { checkInsService } from '@/lib/api/services/checkins';
import { registrationsService } from '@/lib/api/services/registrations';
import type { Session, Participant, CheckIn, Registration } from '@/lib/schemas';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  totalParticipants: number;
  totalSessions: number;
  totalCheckIns: number;
  totalRegistrations: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentSessions: Session[];
  recentCheckIns: CheckIn[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all dashboard data in parallel using useQueries
 */
export function useDashboard(): DashboardData {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.sessions.lists(),
        queryFn: () => sessionsService.getAll(),
        staleTime: 30 * 1000, // 30 seconds
      },
      {
        queryKey: queryKeys.participants.lists(),
        queryFn: () => participantsService.getAll(),
        staleTime: 30 * 1000,
      },
      {
        queryKey: queryKeys.checkIns.lists(),
        queryFn: () => checkInsService.getAll(),
        staleTime: 30 * 1000,
      },
      {
        queryKey: queryKeys.registrations.lists(),
        queryFn: () => registrationsService.getAll(),
        staleTime: 30 * 1000,
      },
    ],
  });

  const [sessionsQuery, participantsQuery, checkInsQuery, registrationsQuery] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.error)?.error as ApiError | null;

  const sessions = sessionsQuery.data ?? [];
  const participants = participantsQuery.data ?? [];
  const checkIns = checkInsQuery.data ?? [];
  const registrations = registrationsQuery.data ?? [];

  return {
    stats: {
      totalParticipants: participants.length,
      totalSessions: sessions.length,
      totalCheckIns: checkIns.length,
      totalRegistrations: registrations.length,
    },
    recentSessions: sessions.slice(0, 5),
    recentCheckIns: checkIns.slice(0, 5),
    isLoading,
    isError,
    error,
  };
}

/**
 * Fetch dashboard statistics only (lighter query)
 */
export function useDashboardStats(
  options?: Omit<UseQueryOptions<DashboardStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const [sessions, participants, checkIns, registrations] = await Promise.all([
        sessionsService.getAll(),
        participantsService.getAll(),
        checkInsService.getAll(),
        registrationsService.getAll(),
      ]);

      return {
        totalParticipants: participants.length,
        totalSessions: sessions.length,
        totalCheckIns: checkIns.length,
        totalRegistrations: registrations.length,
      };
    },
    staleTime: 30 * 1000, // Stats refresh every 30 seconds
    ...options,
  });
}
