import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkParticipantItemDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'ACME Corp' })
  organization?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;
}

export class BulkCreateParticipantsDto {
  @ApiProperty({
    type: [BulkParticipantItemDto],
    description: 'Array of participants to create',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkParticipantItemDto)
  participants: BulkParticipantItemDto[];
}

export class AddReferredParticipantDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the participant to add as referred',
  })
  @IsMongoId()
  participantId: string;
}

export class TravelGrantDecisionDto {
  @ApiProperty({
    example: true,
    description: 'Whether to approve (true) or reject (false) the travel grant',
  })
  @IsBoolean()
  approved: boolean;
}
