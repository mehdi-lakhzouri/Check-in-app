import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type RegistrationDocument = Registration & Document;

export enum RegistrationStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'registrations' })
export class Registration {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Participant ID' })
  @Prop({ type: Types.ObjectId, ref: 'Participant', required: true, index: true })
  participantId: Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Session ID' })
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true, index: true })
  sessionId: Types.ObjectId;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Registration date' })
  @Prop({ type: Date, default: Date.now })
  registrationDate: Date;

  @ApiProperty({ 
    example: 'confirmed', 
    enum: RegistrationStatus,
    description: 'Registration status' 
  })
  @Prop({ 
    type: String, 
    enum: RegistrationStatus, 
    default: RegistrationStatus.PENDING,
    index: true 
  })
  status: RegistrationStatus;

  @ApiPropertyOptional({ example: 'Special dietary requirements', description: 'Additional notes' })
  @Prop({ trim: true })
  notes?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);

// Compound index for unique participant-session registration
RegistrationSchema.index({ participantId: 1, sessionId: 1 }, { unique: true });
RegistrationSchema.index({ status: 1, sessionId: 1 });
