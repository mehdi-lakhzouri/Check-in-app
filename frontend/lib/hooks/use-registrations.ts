/**
 * Registrations Hooks - TanStack Query hooks for registration management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { registrationsService, type RegistrationStats } from '@/lib/api/services/registrations';
import type { Registration, CreateRegistrationDto } from '@/lib/schemas';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all registrations with optional filters
 */
export function useRegistrations(
  filters?: { sessionId?: string; participantId?: string; status?: string },
  options?: Omit<UseQueryOptions<Registration[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.registrations.list(filters),
    queryFn: () => registrationsService.getAll(filters),
    ...options,
  });
}

/**
 * Fetch registration statistics
 */
export function useRegistrationStats(
  options?: Omit<UseQueryOptions<RegistrationStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['registrations', 'stats'],
    queryFn: () => registrationsService.getStats(),
    ...options,
  });
}

/**
 * Fetch a single registration by ID
 */
export function useRegistration(
  id: string,
  options?: Omit<UseQueryOptions<Registration, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.registrations.detail(id),
    queryFn: () => registrationsService.getById(id),
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new registration with optimistic update
 */
export function useCreateRegistration(
  options?: Omit<UseMutationOptions<Registration, ApiError, CreateRegistrationDto, { previousRegistrations: Registration[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRegistrationDto) => registrationsService.create(data),
    onMutate: async (newRegistration) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.registrations.lists() });

      const previousRegistrations = queryClient.getQueryData<Registration[]>(
        queryKeys.registrations.lists()
      );

      // Optimistically add new registration
      if (previousRegistrations) {
        const optimisticRegistration: Registration = {
          _id: `temp-${Date.now()}`,
          participantId: newRegistration.participantId,
          sessionId: newRegistration.sessionId,
          registrationDate: new Date().toISOString(),
          status: newRegistration.status || 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Registration[]>(
          queryKeys.registrations.lists(),
          [...previousRegistrations, optimisticRegistration]
        );
      }

      return { previousRegistrations };
    },
    onError: (err, newRegistration, context) => {
      if (context?.previousRegistrations) {
        queryClient.setQueryData(
          queryKeys.registrations.lists(),
          context.previousRegistrations
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    },
    ...options,
  });
}

/**
 * Delete a registration with optimistic update
 */
export function useDeleteRegistration(
  options?: Omit<UseMutationOptions<void, ApiError, string, { previousRegistrations: Registration[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => registrationsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.registrations.lists() });

      const previousRegistrations = queryClient.getQueryData<Registration[]>(
        queryKeys.registrations.lists()
      );

      if (previousRegistrations) {
        queryClient.setQueryData<Registration[]>(
          queryKeys.registrations.lists(),
          previousRegistrations.filter((r) => r._id !== id)
        );
      }

      return { previousRegistrations };
    },
    onError: (err, id, context) => {
      if (context?.previousRegistrations) {
        queryClient.setQueryData(
          queryKeys.registrations.lists(),
          context.previousRegistrations
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
    },
    ...options,
  });
}
