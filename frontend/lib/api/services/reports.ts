/**
 * Reports API Service - Type-safe API calls for report generation
 */

import { api, API_BASE_URL } from '../client';
import type { ApiResponse } from '@/lib/schemas';

// ============================================================================
// Types
// ============================================================================

export type ReportFormat = 'json' | 'excel' | 'csv';

export interface AttendanceReportParams {
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  organization?: string;
  format?: ReportFormat;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SessionReportParams {
  format?: ReportFormat;
}

export interface AttendanceReportEntry {
  participantName: string;
  participantEmail: string;
  participantOrganization: string;
  sessionName: string;
  checkInTime: string;
  method: 'qr' | 'manual';
}

export interface AttendanceReportMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AttendanceReportData {
  report: AttendanceReportEntry[];
  meta: AttendanceReportMeta;
  generatedAt: string;
}

export interface SessionReportStatistics {
  totalRegistrations: number;
  totalCheckIns: number;
  attendanceRate: string;
  qrCheckIns: number;
  manualCheckIns: number;
}

export interface SessionReportCheckIn {
  participantName: string;
  participantEmail: string;
  organization: string;
  checkInTime: string;
  method: 'qr' | 'manual';
}

export interface SessionReportSession {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  location?: string;
}

export interface SessionReportData {
  session: SessionReportSession;
  statistics: SessionReportStatistics;
  checkIns: SessionReportCheckIn[];
  generatedAt: string;
}

export interface StatisticsReportData {
  sessions: {
    total: number;
    open: number;
    closed: number;
    ended: number;
  };
  participants: {
    total: number;
    active: number;
    ambassadors: number;
    travelGrantApplicants: number;
  };
  checkIns: {
    total: number;
    qr: number;
    manual: number;
    todayCount: number;
  };
  generatedAt: string;
}

export interface SessionSheetEntry {
  sessionId: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  location?: string;
  isOpen: boolean;
  capacity?: number;
  registrations: number;
  checkIns: number;
  attendanceRate: string;
}

export interface SessionsSheetsData {
  sessions: SessionSheetEntry[];
  summary: {
    totalSessions: number;
    openSessions: number;
    closedSessions: number;
  };
  generatedAt: string;
}

// Helper type for API params
type ApiParams = Record<string, string | number | boolean | undefined>;

// ============================================================================
// API Service
// ============================================================================

export const reportsService = {
  /**
   * Generate attendance report with optional filters
   */
  getAttendanceReport: async (params: AttendanceReportParams = {}): Promise<AttendanceReportData> => {
    const res = await api.get<ApiResponse<AttendanceReportData>>('/reports/attendance', params as ApiParams);
    return res.data;
  },

  /**
   * Generate report for a specific session
   */
  getSessionReport: async (sessionId: string, params: SessionReportParams = {}): Promise<SessionReportData> => {
    const res = await api.get<ApiResponse<SessionReportData>>(`/reports/session/${sessionId}`, params as ApiParams);
    return res.data;
  },

  /**
   * Generate overall statistics report
   */
  getStatisticsReport: async (): Promise<StatisticsReportData> => {
    const res = await api.get<ApiResponse<StatisticsReportData>>('/reports/statistics');
    return res.data;
  },

  /**
   * Generate sessions overview sheets
   */
  getSessionsSheets: async (): Promise<SessionsSheetsData> => {
    const res = await api.get<ApiResponse<SessionsSheetsData>>('/reports/sessions-sheets');
    return res.data;
  },

  /**
   * Download attendance report as Excel file
   */
  downloadAttendanceExcel: (params: Omit<AttendanceReportParams, 'format'> = {}): void => {
    const searchParams = new URLSearchParams();
    searchParams.set('format', 'excel');
    
    if (params.sessionId) searchParams.set('sessionId', params.sessionId);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.organization) searchParams.set('organization', params.organization);
    
    const url = `${API_BASE_URL}/reports/attendance?${searchParams.toString()}`;
    window.open(url, '_blank');
  },

  /**
   * Download session report as Excel file
   */
  downloadSessionExcel: (sessionId: string): void => {
    const url = `${API_BASE_URL}/reports/session/${sessionId}?format=excel`;
    window.open(url, '_blank');
  },
};
