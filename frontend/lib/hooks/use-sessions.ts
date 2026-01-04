/**
 * Sessions Hooks - TanStack Query hooks for session management
 * Includes queries, mutations, and optimistic updates
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseSuspenseQueryOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/api/query-keys';
import { sessionsService, type BulkCreateResult, type BulkCreateSessionsDto } from '@/lib/api/services/sessions';
import type {
  Session,
  CreateSessionDto,
  UpdateSessionDto,
  CheckIn,
} from '@/lib/schemas';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all sessions
 */
export function useSessions(
  options?: Omit<UseQueryOptions<Session[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.sessions.lists(),
    queryFn: () => sessionsService.getAll(),
    ...options,
  });
}

/**
 * Fetch a single session by ID
 */
export function useSession(
  id: string,
  options?: Omit<UseQueryOptions<Session, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => sessionsService.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch check-ins for a specific session
 */
export function useSessionCheckIns(
  sessionId: string,
  options?: Omit<UseQueryOptions<CheckIn[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.sessions.checkIns(sessionId),
    queryFn: () => sessionsService.getCheckIns(sessionId),
    enabled: !!sessionId,
    ...options,
  });
}

// ============================================================================
// Suspense Query Hooks
// ============================================================================

/**
 * Suspense-enabled hook to fetch all sessions
 * Use with React Suspense for cleaner loading states
 */
export function useSessionsSuspense(
  options?: Omit<UseSuspenseQueryOptions<Session[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useSuspenseQuery({
    queryKey: queryKeys.sessions.lists(),
    queryFn: () => sessionsService.getAll(),
    ...options,
  });
}

/**
 * Suspense-enabled hook to fetch a single session by ID
 */
export function useSessionSuspense(
  id: string,
  options?: Omit<UseSuspenseQueryOptions<Session, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useSuspenseQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => sessionsService.getById(id),
    ...options,
  });
}

// ============================================================================
// Prefetch Hooks
// ============================================================================

/**
 * Prefetch a single session by ID
 * Use on hover/focus for instant navigation
 */
export function usePrefetchSession() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.sessions.detail(id),
        queryFn: () => sessionsService.getById(id),
        staleTime: 60 * 1000, // Consider fresh for 1 minute
      });
    },
    [queryClient]
  );
}

/**
 * Prefetch all sessions
 * Useful for dashboard preloading
 */
export function usePrefetchSessions() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.sessions.lists(),
      queryFn: () => sessionsService.getAll(),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);
}

/**
 * Prefetch session check-ins
 */
export function usePrefetchSessionCheckIns() {
  const queryClient = useQueryClient();
  return useCallback(
    (sessionId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.sessions.checkIns(sessionId),
        queryFn: () => sessionsService.getCheckIns(sessionId),
        staleTime: 30 * 1000,
      });
    },
    [queryClient]
  );
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new session with optimistic update
 */
export function useCreateSession(
  options?: Omit<UseMutationOptions<Session, ApiError, CreateSessionDto, { previousSessions: Session[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSessionDto) => sessionsService.create(data),
    onMutate: async (newSession) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.lists() });

      // Snapshot previous value
      const previousSessions = queryClient.getQueryData<Session[]>(
        queryKeys.sessions.lists()
      );

      // Optimistically add new session
      if (previousSessions) {
        const optimisticSession: Session = {
          _id: `temp-${Date.now()}`,
          name: newSession.name,
          description: newSession.description,
          startTime: newSession.startTime,
          endTime: newSession.endTime,
          location: newSession.location,
          isOpen: newSession.isOpen ?? false,
          capacity: newSession.capacity,
          checkInsCount: 0,
          capacityEnforced: newSession.capacityEnforced ?? true,
          requiresRegistration: newSession.requiresRegistration ?? false,
          day: newSession.day ?? 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Session[]>(
          queryKeys.sessions.lists(),
          [...previousSessions, optimisticSession]
        );
      }

      return { previousSessions };
    },
    onError: (err, newSession, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.sessions.lists(),
          context.previousSessions
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}

/**
 * Update an existing session with optimistic update
 */
export function useUpdateSession(
  options?: Omit<
    UseMutationOptions<Session, ApiError, { id: string; data: UpdateSessionDto }, { previousSessions: Session[] | undefined; previousSession: Session | undefined }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => sessionsService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.detail(id) });

      const previousSessions = queryClient.getQueryData<Session[]>(
        queryKeys.sessions.lists()
      );
      const previousSession = queryClient.getQueryData<Session>(
        queryKeys.sessions.detail(id)
      );

      // Optimistically update the session in the list
      if (previousSessions) {
        queryClient.setQueryData<Session[]>(
          queryKeys.sessions.lists(),
          previousSessions.map((s) =>
            s._id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
          )
        );
      }

      // Optimistically update the single session
      if (previousSession) {
        queryClient.setQueryData<Session>(queryKeys.sessions.detail(id), {
          ...previousSession,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousSessions, previousSession };
    },
    onError: (err, { id }, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.sessions.lists(),
          context.previousSessions
        );
      }
      if (context?.previousSession) {
        queryClient.setQueryData(
          queryKeys.sessions.detail(id),
          context.previousSession
        );
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}

/**
 * Delete a session with optimistic update
 */
export function useDeleteSession(
  options?: Omit<UseMutationOptions<void, ApiError, string, { previousSessions: Session[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sessionsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.lists() });

      const previousSessions = queryClient.getQueryData<Session[]>(
        queryKeys.sessions.lists()
      );

      // Optimistically remove the session
      if (previousSessions) {
        queryClient.setQueryData<Session[]>(
          queryKeys.sessions.lists(),
          previousSessions.filter((s) => s._id !== id)
        );
      }

      return { previousSessions };
    },
    onError: (err, id, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.sessions.lists(),
          context.previousSessions
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    },
    ...options,
  });
}

/**
 * Bulk create multiple sessions at once
 */
export function useBulkCreateSessions(
  options?: Omit<UseMutationOptions<BulkCreateResult, ApiError, BulkCreateSessionsDto>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateSessionsDto) => sessionsService.bulkCreate(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}
