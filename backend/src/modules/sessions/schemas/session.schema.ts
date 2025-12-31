import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: 'Opening Ceremony', description: 'Session name' })
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @ApiPropertyOptional({ example: 'Welcome session for all participants', description: 'Session description' })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ example: '2024-01-01T09:00:00.000Z', description: 'Session start time' })
  @Prop({ required: true, type: Date, index: true })
  startTime: Date;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z', description: 'Session end time' })
  @Prop({ required: true, type: Date })
  endTime: Date;

  @ApiPropertyOptional({ example: 'Main Hall', description: 'Session location/venue' })
  @Prop({ trim: true })
  location?: string;

  @ApiProperty({ example: true, description: 'Whether check-in is open for this session' })
  @Prop({ default: false, index: true })
  isOpen: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Maximum capacity for the session' })
  @Prop({ default: 0 })
  capacity?: number;

  @ApiProperty({ example: 0, description: 'Number of check-ins for this session' })
  @Prop({ default: 0 })
  checkInsCount: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes
SessionSchema.index({ name: 'text', description: 'text' });
SessionSchema.index({ startTime: 1, isOpen: 1 });
