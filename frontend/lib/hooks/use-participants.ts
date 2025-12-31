/**
 * Participants Hooks - TanStack Query hooks for participant management
 * Includes queries, mutations, and optimistic updates
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { participantsService, type QRCodeData, type BulkUploadResult } from '@/lib/api/services/participants';
import type {
  Participant,
  CreateParticipantDto,
  UpdateParticipantDto,
  ParticipantDetails,
  BulkParticipantDto,
} from '@/lib/schemas';
import { ApiError } from '@/lib/api/client';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all participants with optional filters
 */
export function useParticipants(
  filters?: { search?: string; status?: string },
  options?: Omit<UseQueryOptions<Participant[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.participants.list(filters),
    queryFn: () => participantsService.getAll(filters),
    ...options,
  });
}

/**
 * Fetch a single participant by ID
 */
export function useParticipant(
  id: string,
  options?: Omit<UseQueryOptions<Participant, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.participants.detail(id),
    queryFn: () => participantsService.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch detailed participant information including scores, referrals, etc.
 */
export function useParticipantDetails(
  id: string,
  options?: Omit<UseQueryOptions<ParticipantDetails, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.participants.fullDetails(id),
    queryFn: () => participantsService.getDetails(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch participant by QR code
 */
export function useParticipantByQrCode(
  qrCode: string,
  options?: Omit<UseQueryOptions<Participant, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.participants.byQrCode(qrCode),
    queryFn: () => participantsService.getByQrCode(qrCode),
    enabled: !!qrCode,
    ...options,
  });
}

/**
 * Generate a new QR code for participant creation
 */
export function useGenerateQRCode(
  options?: Omit<UseQueryOptions<QRCodeData, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.participants.generateQr(),
    queryFn: () => participantsService.generateQR(),
    staleTime: 0, // Always fetch fresh QR code
    gcTime: 0, // Don't cache QR codes
    ...options,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new participant with optimistic update
 */
export function useCreateParticipant(
  options?: Omit<UseMutationOptions<Participant, ApiError, CreateParticipantDto, { previousParticipants: Participant[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParticipantDto) => participantsService.create(data),
    onMutate: async (newParticipant) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.participants.lists() });

      const previousParticipants = queryClient.getQueryData<Participant[]>(
        queryKeys.participants.lists()
      );

      // Optimistically add new participant
      if (previousParticipants) {
        const optimisticParticipant: Participant = {
          _id: `temp-${Date.now()}`,
          name: newParticipant.name,
          email: newParticipant.email,
          organization: newParticipant.organization,
          qrCode: newParticipant.qrCode || '',
          isActive: true,
          status: newParticipant.status || 'regular',
          ambassadorPoints: 0,
          referredParticipantIds: [],
          travelGrantApplied: false,
          travelGrantApproved: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Participant[]>(
          queryKeys.participants.lists(),
          [...previousParticipants, optimisticParticipant]
        );
      }

      return { previousParticipants };
    },
    onError: (err, newParticipant, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(
          queryKeys.participants.lists(),
          context.previousParticipants
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}

/**
 * Update an existing participant with optimistic update
 */
export function useUpdateParticipant(
  options?: Omit<
    UseMutationOptions<Participant, ApiError, { id: string; data: UpdateParticipantDto }, { previousParticipants: Participant[] | undefined; previousParticipant: Participant | undefined }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => participantsService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.participants.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.participants.detail(id) });

      const previousParticipants = queryClient.getQueryData<Participant[]>(
        queryKeys.participants.lists()
      );
      const previousParticipant = queryClient.getQueryData<Participant>(
        queryKeys.participants.detail(id)
      );

      // Optimistically update
      if (previousParticipants) {
        queryClient.setQueryData<Participant[]>(
          queryKeys.participants.lists(),
          previousParticipants.map((p) =>
            p._id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          )
        );
      }

      if (previousParticipant) {
        queryClient.setQueryData<Participant>(queryKeys.participants.detail(id), {
          ...previousParticipant,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousParticipants, previousParticipant };
    },
    onError: (err, { id }, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(
          queryKeys.participants.lists(),
          context.previousParticipants
        );
      }
      if (context?.previousParticipant) {
        queryClient.setQueryData(
          queryKeys.participants.detail(id),
          context.previousParticipant
        );
      }
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}

/**
 * Delete a participant with optimistic update
 */
export function useDeleteParticipant(
  options?: Omit<UseMutationOptions<void, ApiError, string, { previousParticipants: Participant[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => participantsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.participants.lists() });

      const previousParticipants = queryClient.getQueryData<Participant[]>(
        queryKeys.participants.lists()
      );

      if (previousParticipants) {
        queryClient.setQueryData<Participant[]>(
          queryKeys.participants.lists(),
          previousParticipants.filter((p) => p._id !== id)
        );
      }

      return { previousParticipants };
    },
    onError: (err, id, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(
          queryKeys.participants.lists(),
          context.previousParticipants
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    },
    ...options,
  });
}

/**
 * Bulk upload participants
 */
export function useBulkUploadParticipants(
  options?: Omit<UseMutationOptions<BulkUploadResult, ApiError, BulkParticipantDto[]>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participants: BulkParticipantDto[]) =>
      participantsService.bulkUpload(participants),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.participants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    ...options,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Download QR codes for all participants
 */
export function downloadParticipantQRCodes(): void {
  participantsService.downloadQRCodes();
}

/**
 * Download template for bulk upload
 */
export function downloadParticipantTemplate(): void {
  participantsService.downloadTemplate();
}
