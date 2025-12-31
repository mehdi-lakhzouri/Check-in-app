import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class AssignParticipantsDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of participant IDs to assign to the session',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  participantIds: string[];
}
