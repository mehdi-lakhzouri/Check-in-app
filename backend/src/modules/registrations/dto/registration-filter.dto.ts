import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { RegistrationStatus } from '../schemas';

export class RegistrationFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'confirmed',
    enum: RegistrationStatus,
    description: 'Filter by registration status',
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

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
}
