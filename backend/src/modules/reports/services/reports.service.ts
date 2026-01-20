import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { SessionsService } from '../../sessions/services';
import { ParticipantsService } from '../../participants/services';
import { CheckInsService } from '../../checkins/services';
import { RegistrationsService } from '../../registrations/services';
import { AttendanceReportDto, ReportFormat } from '../dto';
import { PinoLoggerService, getCurrentRequestId } from '../../../common/logger';

@Injectable()
export class ReportsService {
  private readonly logger: PinoLoggerService;

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly participantsService: ParticipantsService,
    private readonly checkInsService: CheckInsService,
    private readonly registrationsService: RegistrationsService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(ReportsService.name);
  }

  async generateAttendanceReport(dto: AttendanceReportDto) {
    this.logger.debug('Generating attendance report', {
      filters: dto,
      reqId: getCurrentRequestId(),
    });

    const checkIns = await this.checkInsService.findAll({
      sessionId: dto.sessionId,
      checkInAfter: dto.startDate,
      checkInBefore: dto.endDate,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });

    const reportData = await Promise.all(
      checkIns.data.map(async (checkIn) => {
        const participant = checkIn.participantId as any;
        const session = checkIn.sessionId as any;

        return {
          participantName: participant?.name || 'Unknown',
          participantEmail: participant?.email || 'Unknown',
          participantOrganization: participant?.organization || 'N/A',
          sessionName: session?.name || 'Unknown',
          checkInTime: checkIn.checkInTime,
          method: checkIn.method,
        };
      }),
    );

    if (dto.format === ReportFormat.EXCEL) {
      return this.generateExcelReport(reportData, 'attendance-report');
    }

    return {
      report: reportData,
      meta: checkIns.meta,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateSessionReport(
    sessionId: string,
    format: ReportFormat = ReportFormat.JSON,
  ) {
    this.logger.log(`Generating session report for: ${sessionId}`);

    const session = await this.sessionsService.findOne(sessionId);
    const checkIns = await this.checkInsService.findBySession(sessionId);
    const registrations =
      await this.registrationsService.findBySession(sessionId);

    const reportData = {
      session: {
        id: session._id,
        name: session.name,
        startTime: session.startTime,
        endTime: session.endTime,
        isOpen: session.isOpen,
        location: session.location,
      },
      statistics: {
        totalRegistrations: registrations.length,
        totalCheckIns: checkIns.length,
        attendanceRate:
          registrations.length > 0
            ? ((checkIns.length / registrations.length) * 100).toFixed(2) + '%'
            : '0%',
        qrCheckIns: checkIns.filter((c) => c.method === 'qr').length,
        manualCheckIns: checkIns.filter((c) => c.method === 'manual').length,
      },
      checkIns: checkIns.map((checkIn) => ({
        participantName: (checkIn.participantId as any)?.name || 'Unknown',
        participantEmail: (checkIn.participantId as any)?.email || 'Unknown',
        organization: (checkIn.participantId as any)?.organization || 'N/A',
        checkInTime: checkIn.checkInTime,
        method: checkIn.method,
      })),
      generatedAt: new Date().toISOString(),
    };

    if (format === ReportFormat.EXCEL) {
      return this.generateExcelReport(
        reportData.checkIns,
        `session-${sessionId}-report`,
      );
    }

    return reportData;
  }

  async generateStatisticsReport() {
    this.logger.log('Generating statistics report');

    const [sessionStats, participantStats, checkInStats] = await Promise.all([
      this.sessionsService.getStats(),
      this.participantsService.getStats(),
      this.checkInsService.getStats(),
    ]);

    return {
      sessions: sessionStats,
      participants: participantStats,
      checkIns: checkInStats,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateSessionsSheets() {
    this.logger.log('Generating sessions overview sheets');

    const sessionsResult = await this.sessionsService.findAll({ limit: 1000 });
    const sessions = sessionsResult.data;

    const sheetsData = await Promise.all(
      sessions.map(async (session) => {
        const checkIns = await this.checkInsService.findBySession(
          session._id.toString(),
        );
        const registrations = await this.registrationsService.findBySession(
          session._id.toString(),
        );

        return {
          sessionId: session._id,
          sessionName: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location,
          isOpen: session.isOpen,
          capacity: session.capacity,
          registrations: registrations.length,
          checkIns: checkIns.length,
          attendanceRate:
            registrations.length > 0
              ? ((checkIns.length / registrations.length) * 100).toFixed(2) +
                '%'
              : '0%',
        };
      }),
    );

    return {
      sessions: sheetsData,
      summary: {
        totalSessions: sessions.length,
        openSessions: sessions.filter((s) => s.isOpen).length,
        closedSessions: sessions.filter((s) => !s.isOpen).length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private generateExcelReport(
    data: any[],
    filename: string,
  ): { buffer: Buffer; filename: string } {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      filename: `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }
}
