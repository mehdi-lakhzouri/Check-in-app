/**
 * Registrations API Service - Type-safe API calls for registration management
 */

import { api } from '../client';
import type {
  Registration,
  CreateRegistrationDto,
  ApiResponse,
} from '@/lib/schemas';

export interface RegistrationStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  todayRegistrations: number;
}

export const registrationsService = {
  /**
   * Get all registrations
   */
  getAll: async (filters?: { sessionId?: string; participantId?: string; status?: string }): Promise<Registration[]> => {
    const res = await api.get<ApiResponse<Registration[]>>('/registrations', filters);
    return res.data;
  },

  /**
   * Get registration statistics
   */
  getStats: async (): Promise<RegistrationStats> => {
    const res = await api.get<ApiResponse<RegistrationStats>>('/registrations/stats/overview');
    return res.data;
  },

  /**
   * Get registration by ID
   */
  getById: async (id: string): Promise<Registration> => {
    const res = await api.get<ApiResponse<Registration>>(`/registrations/${id}`);
    return res.data;
  },

  /**
   * Create a new registration
   */
  create: async (data: CreateRegistrationDto): Promise<Registration> => {
    const res = await api.post<ApiResponse<Registration>>('/registrations', data);
    return res.data;
  },

  /**
   * Delete a registration
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/registrations/${id}`);
  },
};
