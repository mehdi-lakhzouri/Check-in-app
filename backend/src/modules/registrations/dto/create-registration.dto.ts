import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsString } from 'class-validator';
import { RegistrationStatus } from '../schemas';

export class CreateRegistrationDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
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
    example: 'confirmed',
    enum: RegistrationStatus,
    description: 'Registration status',
    default: RegistrationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @ApiPropertyOptional({
    example: 'Special dietary requirements',
    description: 'Additional notes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
