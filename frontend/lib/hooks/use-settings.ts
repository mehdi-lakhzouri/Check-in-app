/**
 * Settings Hooks - TanStack Query hooks for application settings
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
  settingsService,
  type GlobalTimingConfig,
  type ApplicationSettings,
  type UpdateTimingConfigPayload,
} from '@/lib/api/services/settings';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch global timing configuration
 * Useful for displaying current system defaults in the UI
 */
export function useTimingConfig(
  options?: Omit<UseQueryOptions<GlobalTimingConfig, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.settings.timing(),
    queryFn: () => settingsService.getTimingConfig(),
    // Settings don't change often, so we can cache for longer
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Fetch complete application settings
 */
export function useApplicationSettings(
  options?: Omit<UseQueryOptions<ApplicationSettings, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.settings.application(),
    queryFn: () => settingsService.getSettings(),
    // Settings don't change often, so we can cache for longer
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update global timing configuration
 * Returns mutation to update timing settings with optimistic updates
 */
export function useUpdateTimingConfig(
  options?: Omit<UseMutationOptions<GlobalTimingConfig, ApiError, UpdateTimingConfigPayload>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTimingConfigPayload) => 
      settingsService.updateTimingConfig(payload),
    onSuccess: (data) => {
      // Update the timing config cache
      queryClient.setQueryData(queryKeys.settings.timing(), data);
      // Invalidate application settings to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.application() });
    },
    ...options,
  });
}

/**
 * Update timing for a specific session
 */
export function useUpdateSessionTiming(
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, { sessionId: string; timing: Partial<UpdateTimingConfigPayload> }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, timing }: { sessionId: string; timing: Partial<UpdateTimingConfigPayload> }) =>
      settingsService.updateSessionTiming(sessionId, timing),
    onSuccess: (_, variables) => {
      // Invalidate the specific session
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(variables.sessionId) });
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    ...options,
  });
}
