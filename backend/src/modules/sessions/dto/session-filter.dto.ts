import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsDateString, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto';

export class SessionFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Filter by open status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOpen?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Filter sessions starting after this date',
  })
  @IsOptional()
  @IsDateString()
  startAfter?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.000Z',
    description: 'Filter sessions starting before this date',
  })
  @IsOptional()
  @IsDateString()
  startBefore?: string;

  @ApiPropertyOptional({
    example: 'Main Hall',
    description: 'Filter by location',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
