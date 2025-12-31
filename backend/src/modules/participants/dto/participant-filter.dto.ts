import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto';
import { ParticipantStatus } from '../schemas';

export class ParticipantFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'regular',
    enum: ParticipantStatus,
    description: 'Filter by participant status',
  })
  @IsOptional()
  @IsEnum(ParticipantStatus)
  status?: ParticipantStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'ACME Corp',
    description: 'Filter by organization',
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by travel grant application status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  travelGrantApplied?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by travel grant approval status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  travelGrantApproved?: boolean;
}
