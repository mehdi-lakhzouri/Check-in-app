import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    example: 'Opening Ceremony',
    description: 'Session name',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'Welcome session for all participants',
    description: 'Session description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: '2024-01-01T09:00:00.000Z',
    description: 'Session start time (ISO 8601)',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: '2024-01-01T10:00:00.000Z',
    description: 'Session end time (ISO 8601)',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({
    example: 'Main Hall',
    description: 'Session location/venue',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether check-in is open for this session',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum capacity for the session (0 = unlimited)',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether capacity is strictly enforced (false allows overflow)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  capacityEnforced?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether registration is required to check-in (for closed/invite-only sessions)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresRegistration?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Day number of the congress (1, 2, 3, etc.)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  day?: number;
}
