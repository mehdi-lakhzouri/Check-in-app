/**
 * Sessions API Service - Type-safe API calls for session management
 */

import { api } from '../client';
import type {
  Session,
  CreateSessionDto,
  UpdateSessionDto,
  CheckIn,
  ApiResponse,
} from '@/lib/schemas';

export interface SessionsListResponse {
  sessions: Session[];
}

export interface SessionResponse {
  session: Session;
}

export interface SessionCheckInsResponse {
  checkIns: CheckIn[];
}

export interface BulkCreateSessionsDto {
  sessions: CreateSessionDto[];
}

export interface BulkCreateResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    name: string;
    error: string;
  }>;
  created: Array<{
    _id: string;
    name: string;
  }>;
}

export const sessionsService = {
  /**
   * Get all sessions
   */
  getAll: async (): Promise<Session[]> => {
    const res = await api.get<ApiResponse<Session[]>>('/sessions');
    return res.data;
  },

  /**
   * Get session by ID
   */
  getById: async (id: string): Promise<Session> => {
    const res = await api.get<ApiResponse<Session>>(`/sessions/${id}`);
    return res.data;
  },

  /**
   * Create a new session
   */
  create: async (data: CreateSessionDto): Promise<Session> => {
    const res = await api.post<ApiResponse<Session>>('/sessions', data);
    return res.data;
  },

  /**
   * Bulk create multiple sessions
   */
  bulkCreate: async (data: BulkCreateSessionsDto): Promise<BulkCreateResult> => {
    const res = await api.post<ApiResponse<BulkCreateResult>>('/sessions/bulk', data);
    return res.data;
  },

  /**
   * Update an existing session
   */
  update: async (id: string, data: UpdateSessionDto): Promise<Session> => {
    const res = await api.patch<ApiResponse<Session>>(`/sessions/${id}`, data);
    return res.data;
  },

  /**
   * Delete a session
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/sessions/${id}`);
  },

  /**
   * Get all check-ins for a session
   */
  getCheckIns: async (id: string): Promise<CheckIn[]> => {
    const res = await api.get<ApiResponse<CheckIn[]>>(`/sessions/${id}/checkins`);
    return res.data;
  },
};
