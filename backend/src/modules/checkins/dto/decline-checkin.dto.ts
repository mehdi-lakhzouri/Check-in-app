import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for declining a check-in
 */
export class DeclineCheckInDto {
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
    description: 'Name of officer declining check-in',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declinedBy?: string;

  @ApiPropertyOptional({
    example: 'Not registered for this session',
    description: 'Reason for declining',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
