/**
 * Reports Hooks - TanStack Query hooks for report generation
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  reportsService,
  type AttendanceReportParams,
  type SessionReportParams,
  type AttendanceReportData,
  type SessionReportData,
  type StatisticsReportData,
  type SessionsSheetsData,
} from '@/lib/api/services/reports';

// ============================================================================
// Query Key Extensions for Reports
// ============================================================================

export const reportsQueryKeys = {
  all: ['reports'] as const,
  attendance: (params?: AttendanceReportParams) => 
    [...reportsQueryKeys.all, 'attendance', params] as const,
  session: (sessionId: string, params?: SessionReportParams) => 
    [...reportsQueryKeys.all, 'session', sessionId, params] as const,
  statistics: () => [...reportsQueryKeys.all, 'statistics'] as const,
  sessionsSheets: () => [...reportsQueryKeys.all, 'sessions-sheets'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch attendance report with optional filters
 */
export function useAttendanceReport(params: AttendanceReportParams = {}, options?: { enabled?: boolean }) {
  return useQuery<AttendanceReportData, Error>({
    queryKey: reportsQueryKeys.attendance(params),
    queryFn: () => reportsService.getAttendanceReport(params),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch session-specific report
 */
export function useSessionReport(
  sessionId: string | undefined, 
  params: SessionReportParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery<SessionReportData, Error>({
    queryKey: reportsQueryKeys.session(sessionId || '', params),
    queryFn: () => reportsService.getSessionReport(sessionId!, params),
    enabled: !!sessionId && (options?.enabled !== false),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch overall statistics report
 */
export function useStatisticsReport(options?: { enabled?: boolean }) {
  return useQuery<StatisticsReportData, Error>({
    queryKey: reportsQueryKeys.statistics(),
    queryFn: () => reportsService.getStatisticsReport(),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Hook to fetch sessions overview sheets
 */
export function useSessionsSheets(options?: { enabled?: boolean }) {
  return useQuery<SessionsSheetsData, Error>({
    queryKey: reportsQueryKeys.sessionsSheets(),
    queryFn: () => reportsService.getSessionsSheets(),
    staleTime: 60 * 1000,
    ...options,
  });
}

// ============================================================================
// Download Mutations
// ============================================================================

/**
 * Hook to download attendance report as Excel
 */
export function useDownloadAttendanceExcel() {
  return useMutation({
    mutationFn: async (params: Omit<AttendanceReportParams, 'format'>) => {
      reportsService.downloadAttendanceExcel(params);
      return true;
    },
  });
}

/**
 * Hook to download session report as Excel
 */
export function useDownloadSessionExcel() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      reportsService.downloadSessionExcel(sessionId);
      return true;
    },
  });
}

// ============================================================================
// Combined Reports Hook
// ============================================================================

export interface UseReportsOptions {
  attendanceParams?: AttendanceReportParams;
  sessionId?: string;
  sessionParams?: SessionReportParams;
  enableAttendance?: boolean;
  enableSession?: boolean;
  enableStatistics?: boolean;
  enableSessionsSheets?: boolean;
}

/**
 * Combined hook for fetching multiple report types
 */
export function useReports(options: UseReportsOptions = {}) {
  const {
    attendanceParams = {},
    sessionId,
    sessionParams = {},
    enableAttendance = true,
    enableSession = false,
    enableStatistics = true,
    enableSessionsSheets = true,
  } = options;

  const attendanceQuery = useAttendanceReport(attendanceParams, { enabled: enableAttendance });
  const sessionQuery = useSessionReport(sessionId, sessionParams, { enabled: enableSession && !!sessionId });
  const statisticsQuery = useStatisticsReport({ enabled: enableStatistics });
  const sessionsSheetsQuery = useSessionsSheets({ enabled: enableSessionsSheets });

  const isLoading = 
    (enableAttendance && attendanceQuery.isLoading) ||
    (enableSession && sessionQuery.isLoading) ||
    (enableStatistics && statisticsQuery.isLoading) ||
    (enableSessionsSheets && sessionsSheetsQuery.isLoading);

  const isError = 
    attendanceQuery.isError ||
    sessionQuery.isError ||
    statisticsQuery.isError ||
    sessionsSheetsQuery.isError;

  const error = 
    attendanceQuery.error ||
    sessionQuery.error ||
    statisticsQuery.error ||
    sessionsSheetsQuery.error;

  return {
    attendance: attendanceQuery.data,
    session: sessionQuery.data,
    statistics: statisticsQuery.data,
    sessionsSheets: sessionsSheetsQuery.data,
    isLoading,
    isError,
    error,
    refetch: {
      attendance: attendanceQuery.refetch,
      session: sessionQuery.refetch,
      statistics: statisticsQuery.refetch,
      sessionsSheets: sessionsSheetsQuery.refetch,
    },
  };
}
