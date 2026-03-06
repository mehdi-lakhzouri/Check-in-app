'use client';

import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type {
  AttendanceReportData,
  SessionReportData,
  StatisticsReportData,
  SessionsSheetsData,
} from '@/lib/api/services/reports';

// ============================================================================
// Attendance Report Preview
// ============================================================================

interface AttendanceReportPreviewProps {
  data: AttendanceReportData;
  onDownloadExcel?: () => void;
  isDownloading?: boolean;
}

export function AttendanceReportPreview({
  data,
  onDownloadExcel,
  isDownloading,
}: AttendanceReportPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {data.report.length} of {data.meta.total} records
        </div>
        {onDownloadExcel && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDownloadExcel}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Download Excel
          </Button>
        )}
      </div>

      {/* Table */}
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Method</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.report.map((entry, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{entry.participantName}</TableCell>
                <TableCell className="text-muted-foreground">{entry.participantEmail}</TableCell>
                <TableCell>{entry.participantOrganization || '-'}</TableCell>
                <TableCell>{entry.sessionName}</TableCell>
                <TableCell>
                  {format(new Date(entry.checkInTime), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.method === 'qr' ? 'default' : 'secondary'}>
                    {entry.method.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Generated timestamp */}
      <div className="text-xs text-muted-foreground text-right">
        Generated at: {format(new Date(data.generatedAt), 'MMM d, yyyy HH:mm:ss')}
      </div>
    </div>
  );
}

// ============================================================================
// Session Report Preview
// ============================================================================

interface SessionReportPreviewProps {
  data: SessionReportData;
  onDownloadExcel?: () => void;
  isDownloading?: boolean;
}

export function SessionReportPreview({
  data,
  onDownloadExcel,
  isDownloading,
}: SessionReportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-semibold text-lg mb-2">{data.session.name}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium">{data.session.location || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Start:</span>
            <p className="font-medium">
              {format(new Date(data.session.startTime), 'MMM d, HH:mm')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">End:</span>
            <p className="font-medium">
              {format(new Date(data.session.endTime), 'MMM d, HH:mm')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <p>
              <Badge variant={data.session.isOpen ? 'default' : 'secondary'}>
                {data.session.isOpen ? 'Open' : 'Closed'}
              </Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Registrations" value={data.statistics.totalRegistrations} />
        <StatCard label="Check-ins" value={data.statistics.totalCheckIns} />
        <StatCard label="Attendance Rate" value={data.statistics.attendanceRate} highlight />
        <StatCard label="QR Scans" value={data.statistics.qrCheckIns} />
        <StatCard label="Manual" value={data.statistics.manualCheckIns} />
      </div>

      {/* Check-ins Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="font-medium">Check-in Details</h5>
          {onDownloadExcel && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadExcel}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Download Excel
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.checkIns.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{entry.participantName}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.participantEmail}</TableCell>
                  <TableCell>{entry.organization || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(entry.checkInTime), 'HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.method === 'qr' ? 'default' : 'secondary'}>
                      {entry.method.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Generated timestamp */}
      <div className="text-xs text-muted-foreground text-right">
        Generated at: {format(new Date(data.generatedAt), 'MMM d, yyyy HH:mm:ss')}
      </div>
    </div>
  );
}

// ============================================================================
// Statistics Report Preview
// ============================================================================

interface StatisticsReportPreviewProps {
  data: StatisticsReportData;
}

export function StatisticsReportPreview({ data }: StatisticsReportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Sessions Stats */}
      <div>
        <h4 className="font-semibold mb-3">Sessions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={data.sessions.total} />
          <StatCard label="Open" value={data.sessions.open} highlight />
          <StatCard label="Closed" value={data.sessions.closed} />
          <StatCard label="Ended" value={data.sessions.ended} />
        </div>
      </div>

      {/* Participants Stats */}
      <div>
        <h4 className="font-semibold mb-3">Participants</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={data.participants.total} />
          <StatCard label="Active" value={data.participants.active} highlight />
          <StatCard label="Ambassadors" value={data.participants.ambassadors} />
          <StatCard label="Travel Grant" value={data.participants.travelGrantApplicants} />
        </div>
      </div>

      {/* Check-ins Stats */}
      <div>
        <h4 className="font-semibold mb-3">Check-ins</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={data.checkIns.total} />
          <StatCard label="Today" value={data.checkIns.todayCount} highlight />
          <StatCard label="QR Scans" value={data.checkIns.qr} />
          <StatCard label="Manual" value={data.checkIns.manual} />
        </div>
      </div>

      {/* Generated timestamp */}
      <div className="text-xs text-muted-foreground text-right">
        Generated at: {format(new Date(data.generatedAt), 'MMM d, yyyy HH:mm:ss')}
      </div>
    </div>
  );
}

// ============================================================================
// Sessions Sheets Preview
// ============================================================================

interface SessionsSheetsPreviewProps {
  data: SessionsSheetsData;
}

export function SessionsSheetsPreview({ data }: SessionsSheetsPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Sessions" value={data.summary.totalSessions} />
        <StatCard label="Open" value={data.summary.openSessions} highlight />
        <StatCard label="Closed" value={data.summary.closedSessions} />
      </div>

      {/* Sessions Table */}
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Registrations</TableHead>
              <TableHead className="text-right">Check-ins</TableHead>
              <TableHead className="text-right">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.sessions.map((session) => (
              <TableRow key={session.sessionId}>
                <TableCell className="font-medium">{session.sessionName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {session.location || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(session.startTime), 'MMM d, HH:mm')}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={session.isOpen ? 'default' : 'secondary'}>
                    {session.isOpen ? 'Open' : 'Closed'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{session.registrations}</TableCell>
                <TableCell className="text-right">{session.checkIns}</TableCell>
                <TableCell className="text-right font-medium">{session.attendanceRate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Generated timestamp */}
      <div className="text-xs text-muted-foreground text-right">
        Generated at: {format(new Date(data.generatedAt), 'MMM d, yyyy HH:mm:ss')}
      </div>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-primary' : ''}`}>
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Report Preview Dialog
// ============================================================================

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ReportPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="overflow-y-auto pr-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
