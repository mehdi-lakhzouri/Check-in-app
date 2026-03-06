'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText,
  RefreshCw,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { staggerContainer, cardVariants } from '@/lib/animations';

// Module components
import { ReportCard } from './report-card';
import { ReportFilterBar } from './report-filter-bar';
import {
  ReportPreviewDialog,
  AttendanceReportPreview,
  StatisticsReportPreview,
  SessionsSheetsPreview,
} from './report-preview';
import type { ReportCardConfig, ReportFilters, ReportType } from './types';

// Hooks
import {
  useAttendanceReport,
  useStatisticsReport,
  useSessionsSheets,
  useDownloadAttendanceExcel,
} from '@/lib/hooks';
import { useSessions } from '@/lib/hooks';

// Common components
import { PageHeader } from '@/components/common';

// ============================================================================
// Report Card Configurations
// ============================================================================

const reportCards: ReportCardConfig[] = [
  {
    id: 'attendance',
    title: 'Attendance Report',
    description: 'Detailed attendance metrics across all sessions with participant details and check-in timestamps.',
    icon: 'Users',
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    supportsExcel: true,
    supportsFilters: true,
  },
  {
    id: 'statistics',
    title: 'Session Statistics',
    description: 'Comprehensive session performance analytics including registrations, check-ins, and attendance rates.',
    icon: 'BarChart3',
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    supportsExcel: false,
    supportsFilters: false,
  },
  {
    id: 'sessions-sheets',
    title: 'Session Sheets',
    description: 'Printable session attendance sheets with quick overview of all sessions and their metrics.',
    icon: 'FileSpreadsheet',
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    supportsExcel: false,
    supportsFilters: false,
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function ReportsContent() {
  // Filter State
  const [filters, setFilters] = useState<ReportFilters>({
    sessionId: undefined,
    organization: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  // Dialog State
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Data Queries
  const { data: sessions = [] } = useSessions();
  
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance,
  } = useAttendanceReport(
    {
      sessionId: filters.sessionId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      organization: filters.organization,
      limit: 100,
    },
    { enabled: activeReport === 'attendance' }
  );

  const {
    data: statisticsData,
    isLoading: isLoadingStatistics,
    refetch: refetchStatistics,
  } = useStatisticsReport({ enabled: activeReport === 'statistics' });

  const {
    data: sessionsSheetsData,
    isLoading: isLoadingSessionsSheets,
    refetch: refetchSessionsSheets,
  } = useSessionsSheets({ enabled: activeReport === 'sessions-sheets' });

  const downloadAttendanceExcel = useDownloadAttendanceExcel();

  // Handlers
  const handleGenerateReport = useCallback((reportType: ReportType) => {
    setActiveReport(reportType);
    setIsPreviewOpen(true);

    // Trigger refetch based on report type
    switch (reportType) {
      case 'attendance':
        refetchAttendance();
        break;
      case 'statistics':
        refetchStatistics();
        break;
      case 'sessions-sheets':
        refetchSessionsSheets();
        break;
    }
  }, [refetchAttendance, refetchStatistics, refetchSessionsSheets]);

  const handleDownloadExcel = useCallback((reportType: ReportType) => {
    if (reportType === 'attendance') {
      downloadAttendanceExcel.mutate(
        {
          sessionId: filters.sessionId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          organization: filters.organization,
        },
        {
          onSuccess: () => {
            toast.success('Excel download started');
          },
          onError: () => {
            toast.error('Failed to download Excel report');
          },
        }
      );
    }
  }, [downloadAttendanceExcel, filters]);

  const handleRefreshAll = useCallback(() => {
    refetchAttendance();
    refetchStatistics();
    refetchSessionsSheets();
    toast.success('Reports refreshed');
  }, [refetchAttendance, refetchStatistics, refetchSessionsSheets]);

  const getReportTitle = (type: ReportType): string => {
    const config = reportCards.find((c) => c.id === type);
    return config?.title || 'Report';
  };

  const isReportLoading = (type: ReportType): boolean => {
    switch (type) {
      case 'attendance':
        return isLoadingAttendance;
      case 'statistics':
        return isLoadingStatistics;
      case 'sessions-sheets':
        return isLoadingSessionsSheets;
      default:
        return false;
    }
  };

  return (
    <motion.div
      className="space-y-6 pb-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <PageHeader
        icon={FileText}
        title="Reports"
        description="Generate and download comprehensive reports for your event"
        onRefresh={handleRefreshAll}
        actions={[
          {
            label: 'Refresh',
            icon: RefreshCw,
            onClick: handleRefreshAll,
            variant: 'outline',
          },
        ]}
      />

      {/* Filter Bar */}
      <motion.div variants={cardVariants}>
        <ReportFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          sessions={sessions}
          showSessionFilter
          showOrganizationFilter
          showDateFilter
        />
      </motion.div>

      {/* Report Cards Grid */}
      <motion.div
        variants={staggerContainer}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {reportCards.map((config) => (
          <ReportCard
            key={config.id}
            config={config}
            onGenerate={() => handleGenerateReport(config.id)}
            onDownload={
              config.supportsExcel
                ? () => handleDownloadExcel(config.id)
                : undefined
            }
            isLoading={activeReport === config.id && isReportLoading(config.id)}
            isDownloading={
              config.id === 'attendance' && downloadAttendanceExcel.isPending
            }
          />
        ))}
      </motion.div>

      {/* Quick Stats Overview */}
      <motion.div variants={cardVariants}>
        <div className="bg-muted/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Quick Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <QuickStat
              label="Total Sessions"
              value={sessions.length}
              icon={Calendar}
            />
            <QuickStat
              label="Open Sessions"
              value={sessions.filter((s) => s.isOpen).length}
              icon={Calendar}
              highlight
            />
            <QuickStat
              label="With Filters"
              value={Object.values(filters).filter(Boolean).length}
              icon={FileText}
              suffix="active"
            />
            <QuickStat
              label="Reports Available"
              value={reportCards.length}
              icon={FileText}
            />
          </div>
        </div>
      </motion.div>

      {/* Report Preview Dialog */}
      <ReportPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title={activeReport ? getReportTitle(activeReport) : 'Report'}
        description="Preview your generated report data"
      >
        {activeReport === 'attendance' && attendanceData && (
          <AttendanceReportPreview
            data={attendanceData}
            onDownloadExcel={() => handleDownloadExcel('attendance')}
            isDownloading={downloadAttendanceExcel.isPending}
          />
        )}
        {activeReport === 'statistics' && statisticsData && (
          <StatisticsReportPreview data={statisticsData} />
        )}
        {activeReport === 'sessions-sheets' && sessionsSheetsData && (
          <SessionsSheetsPreview data={sessionsSheetsData} />
        )}
        {isReportLoading(activeReport!) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating report...</p>
            </div>
          </div>
        )}
      </ReportPreviewDialog>
    </motion.div>
  );
}

// ============================================================================
// Quick Stat Component
// ============================================================================

function QuickStat({
  label,
  value,
  icon: Icon,
  highlight = false,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  highlight?: boolean;
  suffix?: string;
}) {
  return (
    <div className="bg-background rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
