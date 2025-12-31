/**
 * Check-ins Hooks - TanStack Query hooks for check-in management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { checkInsService, type CheckInResponse, type CheckInStats } from '@/lib/api/services/checkins';
import type { CheckIn, CheckInQrDto, CheckInManualDto } from '@/lib/schemas';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all check-ins with optional filters
 */
export function useCheckIns(
  filters?: { sessionId?: string; participantId?: string },
  options?: Omit<UseQueryOptions<CheckIn[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.checkIns.list(filters),
    queryFn: () => checkInsService.getAll(filters),
    ...options,
  });
}

/**
 * Fetch check-in statistics
 */
export function useCheckInStats(
  sessionId?: string,
  options?: Omit<UseQueryOptions<CheckInStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['checkins', 'stats', sessionId ?? 'all'],
    queryFn: () => checkInsService.getStats(sessionId),
    ...options,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Check-in with QR code
 */
export function useCheckInWithQr(
  options?: Omit<UseMutationOptions<CheckInResponse, ApiError, CheckInQrDto>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckInQrDto) => checkInsService.checkInWithQr(data),
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      
      // If we have the participant ID, invalidate their details
      if (typeof data.checkIn.participantId === 'string') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.participants.fullDetails(data.checkIn.participantId),
        });
      }
    },
    ...options,
  });
}

/**
 * Manual check-in by participant ID
 */
export function useCheckInManual(
  options?: Omit<UseMutationOptions<CheckInResponse, ApiError, CheckInManualDto>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckInManualDto) => checkInsService.checkInManual(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.participants.fullDetails(variables.participantId),
      });
    },
    ...options,
  });
}

/**
 * Delete a check-in record
 */
export function useDeleteCheckIn(
  options?: Omit<UseMutationOptions<void, ApiError, string, { previousCheckIns: CheckIn[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => checkInsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.checkIns.lists() });

      const previousCheckIns = queryClient.getQueryData<CheckIn[]>(
        queryKeys.checkIns.lists()
      );

      if (previousCheckIns) {
        queryClient.setQueryData<CheckIn[]>(
          queryKeys.checkIns.lists(),
          previousCheckIns.filter((c) => c._id !== id)
        );
      }

      return { previousCheckIns };
    },
    onError: (err, id, context) => {
      if (context?.previousCheckIns) {
        queryClient.setQueryData(
          queryKeys.checkIns.lists(),
          context.previousCheckIns
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}
