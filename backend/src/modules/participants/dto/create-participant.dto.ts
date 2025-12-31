import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { ParticipantStatus } from '../schemas';

export class CreateParticipantDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Participant full name',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Participant email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'ACME Corp',
    description: 'Organization/Company name',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organization?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'regular',
    enum: ParticipantStatus,
    description: 'Participant status type',
    default: ParticipantStatus.REGULAR,
  })
  @IsOptional()
  @IsEnum(ParticipantStatus)
  status?: ParticipantStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether participant is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'VIP guest',
    description: 'Additional notes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    example: 'QR-ABC123XYZ',
    description: 'Pre-generated QR code. If not provided, will be auto-generated.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^QR-[A-Z0-9-]+$/i, {
    message: 'QR code must start with "QR-" followed by alphanumeric characters',
  })
  qrCode?: string;
}
