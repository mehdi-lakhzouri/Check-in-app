import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsMongoId, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { CheckInMethod } from '../schemas';

export class CheckInFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'qr',
    enum: CheckInMethod,
    description: 'Filter by check-in method',
  })
  @IsOptional()
  @IsEnum(CheckInMethod)
  method?: CheckInMethod;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by participant ID',
  })
  @IsOptional()
  @IsMongoId()
  participantId?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by session ID',
  })
  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Filter check-ins after this date',
  })
  @IsOptional()
  @IsDateString()
  checkInAfter?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.000Z',
    description: 'Filter check-ins before this date',
  })
  @IsOptional()
  @IsDateString()
  checkInBefore?: string;
}
