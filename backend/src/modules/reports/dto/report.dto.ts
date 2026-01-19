import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsMongoId,
  IsDateString,
  IsEnum,
  IsString,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto';

export enum ReportFormat {
  JSON = 'json',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class AttendanceReportDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by session ID',
  })
  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Start date for report',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.000Z',
    description: 'End date for report',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'ACME Corp',
    description: 'Filter by organization',
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    example: 'json',
    enum: ReportFormat,
    description: 'Report output format',
    default: ReportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}

export class SessionReportDto {
  @ApiPropertyOptional({
    example: 'excel',
    enum: ReportFormat,
    description: 'Report output format',
    default: ReportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}
