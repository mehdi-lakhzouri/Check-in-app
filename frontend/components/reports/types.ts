/**
 * Reports Module Types
 */

export type ReportType = 
  | 'attendance'
  | 'session'
  | 'statistics'
  | 'sessions-sheets';

export type ReportFormat = 'json' | 'excel' | 'csv';

export interface ReportCardConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  supportsExcel: boolean;
  supportsFilters: boolean;
}

export interface DateRangeFilter {
  startDate: string | undefined;
  endDate: string | undefined;
}

export interface ReportFilters extends DateRangeFilter {
  sessionId?: string;
  organization?: string;
}

export interface ReportGenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
}
