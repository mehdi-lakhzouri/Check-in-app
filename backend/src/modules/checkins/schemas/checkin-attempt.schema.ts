import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CheckInAttemptDocument = CheckInAttempt & Document;

/**
 * Status of a check-in attempt
 */
export enum AttemptStatus {
  DECLINED = 'declined', // Officer declined entry
  FAILED = 'failed', // System error or validation failure
}

/**
 * CheckInAttempt Schema
 *
 * Logs all declined or failed check-in attempts for audit purposes.
 * This is separate from the CheckIn collection to maintain a clear audit trail.
 */
@Schema({ timestamps: true, collection: 'checkin_attempts' })
export class CheckInAttempt {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Participant ID',
  })
  @Prop({
    type: Types.ObjectId,
    ref: 'Participant',
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID',
  })
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId: Types.ObjectId;

  @ApiProperty({
    example: '2024-01-01T09:30:00.000Z',
    description: 'Attempt timestamp',
  })
  @Prop({ type: Date, default: Date.now, index: true })
  attemptTime: Date;

  @ApiProperty({
    example: 'declined',
    enum: AttemptStatus,
    description: 'Status of the attempt',
  })
  @Prop({
    type: String,
    enum: AttemptStatus,
    required: true,
    index: true,
  })
  status: AttemptStatus;

  @ApiPropertyOptional({
    example: 'John Smith',
    description: 'Name of officer who declined',
  })
  @Prop({ trim: true })
  declinedBy?: string;

  @ApiPropertyOptional({
    example: 'Not registered for this session',
    description: 'Reason for decline',
  })
  @Prop({ trim: true })
  reason?: string;

  @ApiProperty({
    example: false,
    description: 'Whether participant was registered at time of attempt',
  })
  @Prop({ type: Boolean, default: false })
  wasRegistered: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const CheckInAttemptSchema =
  SchemaFactory.createForClass(CheckInAttempt);

// Indexes for common queries
CheckInAttemptSchema.index({ sessionId: 1, attemptTime: -1 });
CheckInAttemptSchema.index({ participantId: 1, attemptTime: -1 });
CheckInAttemptSchema.index({ status: 1, sessionId: 1 });

// Index for recent attempts query
CheckInAttemptSchema.index(
  { attemptTime: -1 },
  { name: 'recent_attempts_idx' },
);
