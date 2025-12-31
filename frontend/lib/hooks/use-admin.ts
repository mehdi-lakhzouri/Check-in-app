/**
 * Admin Dashboard Hooks - TanStack Query hooks for Ambassador and Travel Grant management
 * Includes queries, mutations, and optimistic updates with polling support
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import {
  adminService,
  type AmbassadorLeaderboardItem,
  type AmbassadorActivity,
  type TravelGrantApplication,
  type TravelGrantStats,
  type TravelGrantQualification,
  type ParticipantStats,
  type TravelGrantApplicationFilters,
} from '@/lib/api/services/admin';
import type { Participant } from '@/lib/schemas';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Ambassador Query Hooks
// ============================================================================

/**
 * Fetch ambassador leaderboard with optional polling
 * @param limit - Number of top ambassadors to fetch
 * @param options - Query options including refetchInterval for polling
 */
export function useAmbassadorLeaderboard(
  limit = 10,
  options?: Omit<
    UseQueryOptions<AmbassadorLeaderboardItem[], ApiError>,
    'queryKey' | 'queryFn'
  > & { enablePolling?: boolean }
) {
  const { enablePolling, ...queryOptions } = options || {};

  return useQuery({
    queryKey: queryKeys.admin.ambassadors.leaderboard(limit),
    queryFn: () => adminService.getAmbassadorLeaderboard(limit),
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: enablePolling ? 30 * 1000 : false, // Poll every 30 seconds if enabled
    ...queryOptions,
  });
}

/**
 * Fetch ambassador activity including referred participants
 */
export function useAmbassadorActivity(
  id: string,
  options?: Omit<UseQueryOptions<AmbassadorActivity, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.admin.ambassadors.activity(id),
    queryFn: () => adminService.getAmbassadorActivity(id),
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Ambassador Mutation Hooks
// ============================================================================

/**
 * Calculate ambassador points with optimistic update
 */
export function useCalculateAmbassadorPoints(
  options?: Omit<
    UseMutationOptions<Participant, ApiError, string, { previousLeaderboard?: AmbassadorLeaderboardItem[] }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminService.calculateAmbassadorPoints(id),
    onSettled: () => {
      // Invalidate leaderboard and activity queries
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.ambassadors.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    },
    ...options,
  });
}

interface AddReferredParticipantParams {
  ambassadorId: string;
  participantId: string;
}

/**
 * Add referred participant with optimistic update
 */
export function useAddReferredParticipant(
  options?: Omit<
    UseMutationOptions<
      Participant,
      ApiError,
      AddReferredParticipantParams,
      { previousActivity: AmbassadorActivity | undefined }
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ambassadorId, participantId }: AddReferredParticipantParams) =>
      adminService.addReferredParticipant(ambassadorId, participantId),
    onMutate: async ({ ambassadorId }): Promise<{ previousActivity: AmbassadorActivity | undefined }> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.admin.ambassadors.activity(ambassadorId),
      });

      const previousActivity = queryClient.getQueryData<AmbassadorActivity>(
        queryKeys.admin.ambassadors.activity(ambassadorId)
      );

      return { previousActivity };
    },
    onError: (err, { ambassadorId }, context) => {
      if (context?.previousActivity) {
        queryClient.setQueryData(
          queryKeys.admin.ambassadors.activity(ambassadorId),
          context.previousActivity
        );
      }
    },
    onSettled: (data, error, { ambassadorId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.ambassadors.activity(ambassadorId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.ambassadors.leaderboard(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    },
    ...options,
  });
}

/**
 * Remove referred participant with optimistic update
 */
export function useRemoveReferredParticipant(
  options?: Omit<
    UseMutationOptions<
      Participant,
      ApiError,
      AddReferredParticipantParams,
      { previousActivity: AmbassadorActivity | undefined }
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ambassadorId, participantId }: AddReferredParticipantParams) =>
      adminService.removeReferredParticipant(ambassadorId, participantId),
    onMutate: async ({ ambassadorId, participantId }): Promise<{ previousActivity: AmbassadorActivity | undefined }> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.admin.ambassadors.activity(ambassadorId),
      });

      const previousActivity = queryClient.getQueryData<AmbassadorActivity>(
        queryKeys.admin.ambassadors.activity(ambassadorId)
      );

      // Optimistic update - remove the referred participant
      if (previousActivity) {
        queryClient.setQueryData<AmbassadorActivity>(
          queryKeys.admin.ambassadors.activity(ambassadorId),
          {
            ...previousActivity,
            referredParticipants: previousActivity.referredParticipants.filter(
              (p) => p._id !== participantId
            ),
            totalPoints: Math.max(0, previousActivity.totalPoints - 10),
          }
        );
      }

      return { previousActivity };
    },
    onError: (err, { ambassadorId }, context) => {
      if (context?.previousActivity) {
        queryClient.setQueryData(
          queryKeys.admin.ambassadors.activity(ambassadorId),
          context.previousActivity
        );
      }
    },
    onSettled: (data, error, { ambassadorId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.ambassadors.activity(ambassadorId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.ambassadors.leaderboard(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    },
    ...options,
  });
}

// ============================================================================
// Travel Grant Query Hooks
// ============================================================================

/**
 * Fetch travel grant applications with optional filters
 */
export function useTravelGrantApplications(
  filters?: TravelGrantApplicationFilters,
  options?: Omit<
    UseQueryOptions<TravelGrantApplication[], ApiError>,
    'queryKey' | 'queryFn'
  > & { enablePolling?: boolean }
) {
  const { enablePolling, ...queryOptions } = options || {};

  return useQuery({
    queryKey: queryKeys.admin.travelGrants.applications(filters),
    queryFn: () => adminService.getTravelGrantApplications(filters),
    staleTime: 30 * 1000,
    refetchInterval: enablePolling ? 30 * 1000 : false,
    ...queryOptions,
  });
}

/**
 * Fetch travel grant statistics
 */
export function useTravelGrantStats(
  options?: Omit<UseQueryOptions<TravelGrantStats, ApiError>, 'queryKey' | 'queryFn'> & {
    enablePolling?: boolean;
  }
) {
  const { enablePolling, ...queryOptions } = options || {};

  return useQuery({
    queryKey: queryKeys.admin.travelGrants.stats(),
    queryFn: () => adminService.getTravelGrantStats(),
    staleTime: 30 * 1000,
    refetchInterval: enablePolling ? 30 * 1000 : false,
    ...queryOptions,
  });
}

/**
 * Check travel grant qualification for a participant
 */
export function useTravelGrantQualification(
  id: string,
  options?: Omit<UseQueryOptions<TravelGrantQualification, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.admin.travelGrants.qualification(id),
    queryFn: () => adminService.checkTravelGrantQualification(id),
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Travel Grant Mutation Hooks
// ============================================================================

/**
 * Apply for travel grant
 */
export function useApplyForTravelGrant(
  options?: Omit<UseMutationOptions<Participant, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminService.applyForTravelGrant(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.participantStats() });
    },
    ...options,
  });
}

interface TravelGrantDecisionParams {
  id: string;
  approved: boolean;
}

/**
 * Approve or reject travel grant application with optimistic update
 */
export function useDecideTravelGrant(
  options?: Omit<
    UseMutationOptions<
      Participant,
      ApiError,
      TravelGrantDecisionParams,
      { previousApplications: TravelGrantApplication[] | undefined; previousStats: TravelGrantStats | undefined }
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approved }: TravelGrantDecisionParams) =>
      adminService.decideTravelGrant(id, approved),
    onMutate: async ({ id, approved }): Promise<{ previousApplications: TravelGrantApplication[] | undefined; previousStats: TravelGrantStats | undefined }> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.admin.travelGrants.applications(),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.admin.travelGrants.stats(),
      });

      // Snapshot previous values
      const previousApplications = queryClient.getQueryData<TravelGrantApplication[]>(
        queryKeys.admin.travelGrants.applications()
      );
      const previousStats = queryClient.getQueryData<TravelGrantStats>(
        queryKeys.admin.travelGrants.stats()
      );

      // Optimistically update applications
      if (previousApplications) {
        queryClient.setQueryData<TravelGrantApplication[]>(
          queryKeys.admin.travelGrants.applications(),
          previousApplications.map((app) =>
            app._id === id
              ? {
                  ...app,
                  travelGrantApproved: approved,
                  travelGrantDecidedAt: new Date().toISOString(),
                }
              : app
          )
        );
      }

      // Optimistically update stats
      if (previousStats) {
        const delta = approved
          ? { pending: -1, approved: 1, rejected: 0 }
          : { pending: -1, approved: 0, rejected: 1 };

        queryClient.setQueryData<TravelGrantStats>(queryKeys.admin.travelGrants.stats(), {
          ...previousStats,
          pending: Math.max(0, previousStats.pending + delta.pending),
          approved: previousStats.approved + delta.approved,
          rejected: previousStats.rejected + delta.rejected,
        });
      }

      return { previousApplications, previousStats };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousApplications) {
        queryClient.setQueryData(
          queryKeys.admin.travelGrants.applications(),
          context.previousApplications
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.admin.travelGrants.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.travelGrants.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.participantStats() });
    },
    ...options,
  });
}

// ============================================================================
// Stats Query Hooks
// ============================================================================

/**
 * Fetch participant statistics
 */
export function useParticipantStats(
  options?: Omit<UseQueryOptions<ParticipantStats, ApiError>, 'queryKey' | 'queryFn'> & {
    enablePolling?: boolean;
  }
) {
  const { enablePolling, ...queryOptions } = options || {};

  return useQuery({
    queryKey: queryKeys.admin.participantStats(),
    queryFn: () => adminService.getParticipantStats(),
    staleTime: 30 * 1000,
    refetchInterval: enablePolling ? 60 * 1000 : false, // Poll every minute
    ...queryOptions,
  });
}

// ============================================================================
// Combined Dashboard Hook
// ============================================================================

/**
 * Combined hook for admin dashboard data
 * Fetches all data needed for the dashboard overview
 */
export function useAdminDashboard(options?: { enablePolling?: boolean }) {
  const { enablePolling = false } = options || {};

  const participantStatsQuery = useParticipantStats({ enablePolling });
  const travelGrantStatsQuery = useTravelGrantStats({ enablePolling });
  const leaderboardQuery = useAmbassadorLeaderboard(10, { enablePolling });

  const isLoading =
    participantStatsQuery.isLoading ||
    travelGrantStatsQuery.isLoading ||
    leaderboardQuery.isLoading;

  const isError =
    participantStatsQuery.isError ||
    travelGrantStatsQuery.isError ||
    leaderboardQuery.isError;

  const error =
    participantStatsQuery.error || travelGrantStatsQuery.error || leaderboardQuery.error;

  return {
    participantStats: participantStatsQuery.data,
    travelGrantStats: travelGrantStatsQuery.data,
    leaderboard: leaderboardQuery.data,
    isLoading,
    isError,
    error,
    refetch: () => {
      participantStatsQuery.refetch();
      travelGrantStatsQuery.refetch();
      leaderboardQuery.refetch();
    },
  };
}
