import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateSessionDto } from './create-session.dto';

export class BulkCreateSessionsDto {
  @ApiProperty({
    type: [CreateSessionDto],
    description: 'Array of sessions to create',
    example: [
      {
        name: 'Opening Ceremony',
        description: 'Welcome event',
        startTime: '2024-01-01T09:00:00.000Z',
        endTime: '2024-01-01T10:00:00.000Z',
        location: 'Main Hall',
        isOpen: false,
      },
      {
        name: 'Workshop A',
        description: 'Technical workshop',
        startTime: '2024-01-01T10:30:00.000Z',
        endTime: '2024-01-01T12:00:00.000Z',
        location: 'Room 101',
        isOpen: false,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one session is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateSessionDto)
  sessions: CreateSessionDto[];
}

export interface BulkCreateResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    name: string;
    error: string;
  }>;
  created: Array<{
    _id: string;
    name: string;
  }>;
}
