/**
 * Participants API Service - Type-safe API calls for participant management
 */

import { api, API_BASE_URL } from '../client';
import type {
  Participant,
  CreateParticipantDto,
  UpdateParticipantDto,
  ParticipantDetails,
  BulkParticipantDto,
  ApiResponse,
} from '@/lib/schemas';

export interface QRCodeData {
  qrCode: string;
  qrCodeDataUrl: string;
}

export interface BulkUploadResult {
  created: number;
  updated: number;
  errors: number;
  details: Array<{
    email: string;
    status: 'created' | 'updated' | 'error';
    message?: string;
  }>;
}

export const participantsService = {
  /**
   * Get all participants with optional search filter
   */
  getAll: async (filters?: { search?: string; status?: string }): Promise<Participant[]> => {
    const res = await api.get<ApiResponse<Participant[]>>('/participants', {
      search: filters?.search,
      status: filters?.status,
    });
    return res.data;
  },

  /**
   * Get participant by ID
   */
  getById: async (id: string): Promise<Participant> => {
    const res = await api.get<ApiResponse<Participant>>(`/participants/${id}`);
    return res.data;
  },

  /**
   * Get detailed participant information including scores, referrals, registrations, and check-ins
   */
  getDetails: async (id: string): Promise<ParticipantDetails> => {
    const res = await api.get<ApiResponse<ParticipantDetails>>(`/participants/${id}/details`);
    return res.data;
  },

  /**
   * Get participant by QR code
   */
  getByQrCode: async (qrCode: string): Promise<Participant> => {
    const res = await api.get<ApiResponse<Participant>>(`/participants/qr/${qrCode}`);
    return res.data;
  },

  /**
   * Generate a new unique QR code for participant creation
   */
  generateQR: async (): Promise<QRCodeData> => {
    const res = await api.get<ApiResponse<QRCodeData>>('/participants/generate-qr');
    return res.data;
  },

  /**
   * Create a new participant
   */
  create: async (data: CreateParticipantDto): Promise<Participant> => {
    const res = await api.post<ApiResponse<Participant>>('/participants', data);
    return res.data;
  },

  /**
   * Update an existing participant
   */
  update: async (id: string, data: UpdateParticipantDto): Promise<Participant> => {
    const res = await api.patch<ApiResponse<Participant>>(`/participants/${id}`, data);
    return res.data;
  },

  /**
   * Delete a participant
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/participants/${id}`);
  },

  /**
   * Bulk upload participants from CSV/JSON data
   */
  bulkUpload: async (participants: BulkParticipantDto[]): Promise<BulkUploadResult> => {
    const res = await api.post<ApiResponse<BulkUploadResult>>('/participants/bulk', { participants });
    return res.data;
  },

  /**
   * Download all participant QR codes as a ZIP file
   */
  downloadQRCodes: (): void => {
    window.open(`${API_BASE_URL}/participants/qrcodes/download`, '_blank');
  },

  /**
   * Download Excel template for bulk upload
   */
  downloadTemplate: (): void => {
    window.open(`${API_BASE_URL}/participants/template/download`, '_blank');
  },
};
