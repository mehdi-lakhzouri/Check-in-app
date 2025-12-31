import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsString } from 'class-validator';
import { CheckInMethod } from '../schemas';

export class CreateCheckInDto {
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
    example: 'manual',
    enum: CheckInMethod,
    description: 'Check-in method',
    default: CheckInMethod.MANUAL,
  })
  @IsOptional()
  @IsEnum(CheckInMethod)
  method?: CheckInMethod;

  @ApiPropertyOptional({
    example: 'John Smith',
    description: 'Name of person performing check-in',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkedInBy?: string;

  @ApiPropertyOptional({
    example: 'Late arrival',
    description: 'Additional notes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class QrCheckInDto {
  @ApiProperty({
    example: 'QR-ABC123XYZ',
    description: 'QR code of the participant',
  })
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    example: 'John Smith',
    description: 'Name of person performing check-in',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkedInBy?: string;
}
