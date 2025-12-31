import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ParticipantDocument = Participant & Document;

export enum ParticipantStatus {
  REGULAR = 'regular',
  AMBASSADOR = 'ambassador',
  TRAVEL_GRANT = 'travel_grant',
}

@Schema({ timestamps: true, collection: 'participants' })
export class Participant {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: 'John Doe', description: 'Participant full name' })
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Participant email' })
  @Prop({ required: true, unique: true, trim: true, lowercase: true, index: true })
  email: string;

  @ApiPropertyOptional({ example: 'ACME Corp', description: 'Organization/Company' })
  @Prop({ trim: true, index: true })
  organization?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @Prop({ trim: true })
  phone?: string;

  @ApiProperty({ example: 'QR-ABC123XYZ', description: 'Unique QR code' })
  @Prop({ required: true, unique: true, index: true })
  qrCode: string;

  @ApiProperty({ example: true, description: 'Whether participant is active' })
  @Prop({ default: true, index: true })
  isActive: boolean;

  @ApiProperty({ 
    example: 'regular', 
    enum: ParticipantStatus,
    description: 'Participant status type' 
  })
  @Prop({ 
    type: String, 
    enum: ParticipantStatus, 
    default: ParticipantStatus.REGULAR,
    index: true 
  })
  status: ParticipantStatus;

  @ApiProperty({ example: 0, description: 'Ambassador points (if ambassador)' })
  @Prop({ default: 0 })
  ambassadorPoints: number;

  @ApiPropertyOptional({ 
    description: 'IDs of participants referred by this ambassador',
    type: [String]
  })
  @Prop({ type: [Types.ObjectId], ref: 'Participant', default: [] })
  referredParticipantIds: Types.ObjectId[];

  @ApiProperty({ example: false, description: 'Whether travel grant has been applied' })
  @Prop({ default: false })
  travelGrantApplied: boolean;

  @ApiPropertyOptional({ description: 'Travel grant application status' })
  @Prop({ type: Boolean, default: null })
  travelGrantApproved: boolean | null;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z', description: 'Travel grant application date' })
  @Prop({ type: Date })
  travelGrantAppliedAt?: Date;

  @ApiPropertyOptional({ example: '2024-01-02T00:00:00.000Z', description: 'Travel grant decision date' })
  @Prop({ type: Date })
  travelGrantDecidedAt?: Date;

  @ApiPropertyOptional({ example: 'Regular ticket holder', description: 'Additional notes' })
  @Prop({ trim: true })
  notes?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

// Indexes
ParticipantSchema.index({ name: 'text', email: 'text', organization: 'text' });
ParticipantSchema.index({ status: 1, isActive: 1 });
ParticipantSchema.index({ ambassadorPoints: -1 });
