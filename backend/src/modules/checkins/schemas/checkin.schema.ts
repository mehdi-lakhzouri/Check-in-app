import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CheckInDocument = CheckIn & Document;

export enum CheckInMethod {
  QR = 'qr',
  MANUAL = 'manual',
}

/**
 * Badge indicating check-in status for dashboard display
 */
export enum CheckInBadge {
  ACCEPTED = 'accepted',                       // Standard check-in (registered participant)
  ACCEPTED_UNREGISTERED = 'accepted_unregistered',  // Override check-in (not registered)
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

  @ApiProperty({ 
    example: 'accepted', 
    enum: CheckInBadge,
    description: 'Badge indicating check-in status (for dashboard display)' 
  })
  @Prop({ 
    type: String, 
    enum: CheckInBadge, 
    default: CheckInBadge.ACCEPTED,
    index: true 
  })
  badge: CheckInBadge;

  @ApiProperty({ example: true, description: 'Whether participant was registered at time of check-in' })
  @Prop({ type: Boolean, default: true })
  wasRegistered: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const CheckInSchema = SchemaFactory.createForClass(CheckIn);

// Compound index for unique participant-session check-in
CheckInSchema.index({ participantId: 1, sessionId: 1 }, { unique: true });
CheckInSchema.index({ sessionId: 1, checkInTime: -1 });

// Covering index for check-in verification (high-frequency query)
CheckInSchema.index(
  { participantId: 1, sessionId: 1, checkInTime: -1 },
  { name: 'checkin_verification_idx' }
);

// Index for recent check-ins query (descending by time)
CheckInSchema.index({ checkInTime: -1 }, { name: 'recent_checkins_idx' });

// Index for participant check-in history
CheckInSchema.index({ participantId: 1, checkInTime: -1 }, { name: 'participant_checkin_history_idx' });
