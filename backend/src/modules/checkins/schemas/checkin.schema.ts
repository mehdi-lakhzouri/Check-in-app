import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CheckInDocument = CheckIn & Document;

export enum CheckInMethod {
  QR = 'qr',
  MANUAL = 'manual',
}

@Schema({ timestamps: true, collection: 'checkins' })
export class CheckIn {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Participant ID' })
  @Prop({ type: Types.ObjectId, ref: 'Participant', required: true, index: true })
  participantId: Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Session ID' })
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId: Types.ObjectId;

  @ApiProperty({ example: '2024-01-01T09:30:00.000Z', description: 'Check-in timestamp' })
  @Prop({ type: Date, default: Date.now, index: true })
  checkInTime: Date;

  @ApiProperty({ 
    example: 'qr', 
    enum: CheckInMethod,
    description: 'Method used for check-in' 
  })
  @Prop({ 
    type: String, 
    enum: CheckInMethod, 
    default: CheckInMethod.MANUAL,
    index: true 
  })
  method: CheckInMethod;

  @ApiPropertyOptional({ example: 'John Smith', description: 'Name of person who performed check-in' })
  @Prop({ trim: true })
  checkedInBy?: string;

  @ApiPropertyOptional({ example: 'Late arrival', description: 'Additional notes' })
  @Prop({ trim: true })
  notes?: string;

  @ApiProperty({ example: false, description: 'Whether the check-in was late (after threshold delay from session start)' })
  @Prop({ type: Boolean, default: false, index: true })
  isLate: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const CheckInSchema = SchemaFactory.createForClass(CheckIn);

// Compound index for unique participant-session check-in
CheckInSchema.index({ participantId: 1, sessionId: 1 }, { unique: true });
CheckInSchema.index({ sessionId: 1, checkInTime: -1 });
