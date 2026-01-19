import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { AttemptStatus } from '../schemas';

/**
 * DTO for filtering check-in attempts
 */
export class CheckInAttemptFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by session ID',
  })
  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by participant ID',
  })
  @IsOptional()
  @IsMongoId()
  participantId?: string;

  @ApiPropertyOptional({
    example: 'declined',
    enum: AttemptStatus,
    description: 'Filter by attempt status',
  })
  @IsOptional()
  @IsEnum(AttemptStatus)
  status?: AttemptStatus;
}
