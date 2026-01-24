// =============================================================================
// Participant API Functions
// =============================================================================

import { api } from '@/lib/api/client';
import type { Participant, ApiResponse } from '@/lib/schemas';
import type {
  ParticipantSearchResult,
  ParticipantSearchParams,
  ParticipantFormData,
  BulkUploadResult,
  ParticipantStats,
} from './types';

/**
 * Participant API client
 * Provides all participant-related API operations
 */
export const participantApi = {
  /**
   * Search participants with pagination and filtering
   */
  search: async (params: ParticipantSearchParams): Promise<ParticipantSearchResult> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set('search', params.search);
    if (params.status && params.status !== 'all') {
      queryParams.set('status', params.status);
    }
    if (params.role && params.role !== 'all') {
      queryParams.set('role', params.role);
    }
    if (params.organization) queryParams.set('organization', params.organization);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

    const res = await api.get<
      ApiResponse<Participant[]> & { meta: ParticipantSearchResult['meta'] }
    >(`/participants?${queryParams.toString()}`);
    return { data: res.data, meta: res.meta };
  },

  /**
   * Get all participants (for exports, etc.)
   */
  getAll: async (): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>(`/participants?limit=10000`);
    return res.data;
  },

  /**
   * Get a single participant by ID
   */
  getById: async (id: string): Promise<Participant> => {
    const res = await api.get<ApiResponse<Participant>>(`/participants/${id}`);
    return res.data;
  },

  /**
   * Create a new participant
   */
  create: async (data: ParticipantFormData): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>(`/participants`, data);
    return res.data;
  },

  /**
   * Update an existing participant
   */
  update: async (id: string, data: Partial<ParticipantFormData>): Promise<Participant> => {
    const res = await api.patch<ApiResponse<Participant>>(`/participants/${id}`, data);
    return res.data;
  },

  /**
   * Delete a participant
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/participants/${id}`);
  },

  /**
   * Bulk delete participants
   */
  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const res = await api.post<ApiResponse<{ deleted: number }>>(
      `/participants/bulk-delete`,
      { ids }
    );
    return res.data;
  },

  /**
   * Bulk upload participants from CSV
   */
  bulkUpload: async (file: File): Promise<BulkUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    // Note: The api client handles multipart/form-data automatically
    const res = await api.post<ApiResponse<BulkUploadResult>>(
      `/participants/bulk-upload`,
      formData
    );
    return res.data;
  },

  /**
   * Get participant statistics
   */
  getStats: async (): Promise<ParticipantStats> => {
    const res = await api.get<ApiResponse<ParticipantStats>>(`/participants/stats`);
    return res.data;
  },

  /**
   * Get unique organizations for filter dropdown
   */
  getOrganizations: async (): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>(`/participants/organizations`);
    return res.data;
  },

  /**
   * Export participants to CSV
   * Note: Use fetch directly for blob responses as the api client may not support it
   */
  exportCsv: async (): Promise<Blob> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/participants/export/csv`, {
      method: 'GET',
      credentials: 'include',
    });
    return response.blob();
  },

  /**
   * Generate QR code for a participant
   */
  generateQrCode: async (id: string): Promise<string> => {
    const res = await api.get<ApiResponse<{ qrCode: string }>>(
      `/participants/${id}/qr-code`
    );
    return res.data.qrCode;
  },

  /**
   * Lookup participant by QR code
   */
  lookupByQrCode: async (code: string): Promise<Participant> => {
    const res = await api.get<ApiResponse<Participant>>(
      `/participants/lookup/qr/${encodeURIComponent(code)}`
    );
    return res.data;
  },
};

export default participantApi;
