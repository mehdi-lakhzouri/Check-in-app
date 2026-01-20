import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO for accepting a check-in after verification
 */
export class AcceptCheckInDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Participant ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  participantId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    example: 'Officer Name',
    description: 'Name of officer performing check-in',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkedInBy?: string;

  @ApiPropertyOptional({
    example: 'VIP guest',
    description: 'Additional notes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
