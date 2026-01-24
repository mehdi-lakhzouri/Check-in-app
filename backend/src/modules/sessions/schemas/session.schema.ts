import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type SessionDocument = Session & Document;

/**
 * Session Status Enum - Tracks the lifecycle state of a session
 *
 * Status Flow:
 * SCHEDULED -> OPEN (manual or auto-open) -> ENDED (auto after endTime) or CLOSED (manual)
 *
 * SCHEDULED: Initial state, check-in not yet available
 * OPEN: Check-in is available (opened manually by admin or automatically before start time)
 * ENDED: Session has ended (automatic after endTime passes)
 * CLOSED: Session was manually closed by admin before ending
 * CANCELLED: Session has been cancelled and won't take place
 */
export enum SessionStatus {
  SCHEDULED = 'scheduled',
  OPEN = 'open',
  ENDED = 'ended',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: 'Opening Ceremony', description: 'Session name' })
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @ApiPropertyOptional({
    example: 'Welcome session for all participants',
    description: 'Session description',
  })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({
    example: '2024-01-01T09:00:00.000Z',
    description: 'Session start time',
  })
  @Prop({ required: true, type: Date, index: true })
  startTime: Date;

  @ApiProperty({
    example: '2024-01-01T10:00:00.000Z',
    description: 'Session end time',
  })
  @Prop({ required: true, type: Date })
  endTime: Date;

  @ApiPropertyOptional({
    example: 'Main Hall',
    description: 'Session location/venue',
  })
  @Prop({ trim: true })
  location?: string;

  @ApiProperty({
    example: true,
    description: 'Whether check-in is open for this session',
  })
  @Prop({ default: false, index: true })
  isOpen: boolean;

  @ApiProperty({
    example: 'scheduled',
    description: 'Current status of the session',
    enum: SessionStatus,
    enumName: 'SessionStatus',
  })
  @Prop({
    type: String,
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
    index: true,
  })
  status: SessionStatus;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum capacity for the session (0 = unlimited)',
  })
  @Prop({ default: 0 })
  capacity?: number;

  @ApiProperty({
    example: true,
    description:
      'Whether capacity is strictly enforced (false allows overflow)',
  })
  @Prop({ default: true })
  capacityEnforced: boolean;

  @ApiProperty({
    example: false,
    description:
      'Whether registration is required to check-in (for closed/invite-only sessions)',
  })
  @Prop({ default: false, index: true })
  requiresRegistration: boolean;

  @ApiProperty({
    example: 0,
    description: 'Number of check-ins for this session',
  })
  @Prop({ default: 0 })
  checkInsCount: number;

  @ApiProperty({
    example: 1,
    description: 'Day number of the congress (1, 2, 3, etc.)',
  })
  @Prop({ default: 1, index: true })
  day: number;

  // ============================================================================
  // Per-Session Timing Configuration (Optional - falls back to global config)
  // ============================================================================

  @ApiPropertyOptional({
    example: 15,
    description:
      'Minutes before session start time to auto-open check-in. Leave empty to use system default (AUTO_OPEN_MINUTES_BEFORE env variable).',
    minimum: 0,
    maximum: 1440,
  })
  @Prop({ type: Number })
  autoOpenMinutesBefore?: number;

  @ApiPropertyOptional({
    example: 5,
    description:
      'Grace period in minutes after session end time before auto-ending. Leave empty to use system default (AUTO_END_GRACE_MINUTES env variable).',
    minimum: 0,
    maximum: 1440,
  })
  @Prop({ type: Number })
  autoEndGraceMinutes?: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Minutes after session start time after which check-ins are marked as late. Leave empty to use system default (CHECKIN_LATE_THRESHOLD_MINUTES env variable).',
    minimum: 0,
    maximum: 1440,
  })
  @Prop({ type: Number })
  lateThresholdMinutes?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes
SessionSchema.index({ name: 'text', description: 'text' });
SessionSchema.index({ startTime: 1, isOpen: 1 });
SessionSchema.index({ status: 1, startTime: 1 }); // For scheduler queries
SessionSchema.index({ endTime: 1, status: 1 }); // For auto-end queries
