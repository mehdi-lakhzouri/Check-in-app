import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsMongoId,
  ArrayNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class BulkAssignParticipantsDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of participant IDs to assign',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  participantIds: string[];
}

export class BulkUploadResultDto {
  @ApiProperty({
    example: 10,
    description: 'Number of successfully created records',
  })
  created: number;

  @ApiProperty({ example: 2, description: 'Number of failed records' })
  failed: number;

  @ApiPropertyOptional({
    description: 'List of errors for failed records',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        row: { type: 'number' },
        email: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  errors?: Array<{ row?: number; email?: string; error: string }>;
}

export class BulkAssignResultDto {
  @ApiProperty({
    example: 8,
    description: 'Number of successfully assigned participants',
  })
  assigned: number;

  @ApiProperty({
    example: 2,
    description: 'Number of already assigned (skipped)',
  })
  skipped: number;

  @ApiProperty({ example: 0, description: 'Number of failed assignments' })
  failed: number;

  @ApiPropertyOptional({
    description: 'List of errors for failed assignments',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        participantId: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  errors?: Array<{ participantId: string; error: string }>;
}
