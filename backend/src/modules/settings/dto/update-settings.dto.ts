import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for updating timing settings
 */
export class UpdateTimingSettingsDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Minutes before session start to auto-open check-in',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  autoOpenMinutesBefore?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether auto-end is enabled',
  })
  @IsOptional()
  @IsBoolean()
  autoEndEnabled?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Grace period in minutes after session end before auto-ending',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  autoEndGraceMinutes?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Minutes after session start to mark check-ins as late',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  lateThresholdMinutes?: number;
}

/**
 * DTO for updating session-specific timing
 */
export class UpdateSessionTimingDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID to update',
  })
  sessionId: string;

  @ApiPropertyOptional({
    example: 15,
    description:
      'Minutes before session start to auto-open check-in. Set to null to use global default.',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  autoOpenMinutesBefore?: number | null;

  @ApiPropertyOptional({
    example: 5,
    description:
      'Grace period in minutes after session end before auto-ending. Set to null to use global default.',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  autoEndGraceMinutes?: number | null;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Minutes after session start to mark check-ins as late. Set to null to use global default.',
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  lateThresholdMinutes?: number | null;
}
