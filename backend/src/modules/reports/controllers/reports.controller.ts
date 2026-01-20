import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ReportsService } from '../services';
import { AttendanceReportDto, SessionReportDto, ReportFormat } from '../dto';
import { ParseMongoIdPipe } from '../../../common/pipes';

@ApiTags('reports')
@Controller('reports')
@Throttle({ default: { limit: 50, ttl: 60000 } })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  @ApiOperation({ summary: 'Generate attendance report' })
  @ApiResponse({
    status: 200,
    description: 'Attendance report generated successfully',
  })
  async getAttendanceReport(
    @Query() dto: AttendanceReportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.reportsService.generateAttendanceReport(dto);

    if (dto.format === ReportFormat.EXCEL && (report as any).buffer) {
      const excelReport = report as { buffer: Buffer; filename: string };
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${excelReport.filename}"`,
      });
      return new StreamableFile(excelReport.buffer);
    }

    return {
      status: 'success',
      message: 'Attendance report generated successfully',
      data: report,
    };
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Generate report for a specific session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Session report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionReport(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Query() dto: SessionReportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.reportsService.generateSessionReport(
      sessionId,
      dto.format,
    );

    if (dto.format === ReportFormat.EXCEL && (report as any).buffer) {
      const excelReport = report as { buffer: Buffer; filename: string };
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${excelReport.filename}"`,
      });
      return new StreamableFile(excelReport.buffer);
    }

    return {
      status: 'success',
      message: 'Session report generated successfully',
      data: report,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Generate overall statistics report' })
  @ApiResponse({
    status: 200,
    description: 'Statistics report generated successfully',
  })
  async getStatisticsReport() {
    const report = await this.reportsService.generateStatisticsReport();
    return {
      status: 'success',
      message: 'Statistics report generated successfully',
      data: report,
    };
  }

  @Get('sessions-sheets')
  @ApiOperation({ summary: 'Generate sessions overview sheets' })
  @ApiResponse({
    status: 200,
    description: 'Sessions sheets generated successfully',
  })
  async getSessionsSheets() {
    const report = await this.reportsService.generateSessionsSheets();
    return {
      status: 'success',
      message: 'Sessions sheets generated successfully',
      data: report,
    };
  }
}
