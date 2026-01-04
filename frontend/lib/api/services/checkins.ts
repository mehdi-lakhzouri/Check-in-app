/**
 * Check-ins API Service - Type-safe API calls for check-in management
 */

import { api } from '../client';
import type {
  CheckIn,
  CheckInQrDto,
  CheckInManualDto,
  ApiResponse,
} from '@/lib/schemas';

export interface CapacityInfo {
  capacity: number;
  checkInsCount: number;
  remaining: number;
  percentFull: number;
  isNearCapacity: boolean;
}

export interface CheckInResponse {
  checkIn: CheckIn;
  message: string;
  capacityInfo?: CapacityInfo;
}

export interface CheckInStats {
  total: number;
  qr: number;
  manual: number;
}

export const checkInsService = {
  /**
   * Get all check-ins
   */
  getAll: async (filters?: { sessionId?: string; participantId?: string }): Promise<CheckIn[]> => {
    const res = await api.get<ApiResponse<CheckIn[]>>('/checkin', filters);
    return res.data;
  },

  /**
   * Get check-in statistics
   */
  getStats: async (sessionId?: string): Promise<CheckInStats> => {
    const params = sessionId ? { sessionId } : undefined;
    const res = await api.get<ApiResponse<CheckInStats>>('/checkin/stats', params);
    return res.data;
  },

  /**
   * Check-in a participant using QR code
   */
  checkInWithQr: async (data: CheckInQrDto): Promise<CheckInResponse> => {
    const res = await api.post<ApiResponse<CheckIn> & { message: string; capacityInfo?: CapacityInfo }>('/checkin/qr', data);
    return { checkIn: res.data, message: res.message || 'Check-in successful', capacityInfo: res.capacityInfo };
  },

  /**
   * Check-in a participant manually (by ID)
   */
  checkInManual: async (data: CheckInManualDto): Promise<CheckInResponse> => {
    const res = await api.post<ApiResponse<CheckIn> & { message: string; capacityInfo?: CapacityInfo }>('/checkin', data);
    return { checkIn: res.data, message: res.message || 'Check-in successful', capacityInfo: res.capacityInfo };
  },

  /**
   * Delete a check-in record
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/checkin/${id}`);
  },
};
