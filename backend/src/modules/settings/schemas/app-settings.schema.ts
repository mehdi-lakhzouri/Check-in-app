import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type AppSettingsDocument = AppSettings & Document;

/**
 * Timing Configuration - Stored settings for session timing
 */
@Schema({ _id: false })
export class TimingSettings {
  @ApiProperty({
    example: 10,
    description: 'Minutes before session start to auto-open check-in',
  })
  @Prop({ type: Number, default: 10 })
  autoOpenMinutesBefore: number;

  @ApiProperty({
    example: true,
    description: 'Whether auto-end is enabled',
  })
  @Prop({ type: Boolean, default: true })
  autoEndEnabled: boolean;

  @ApiProperty({
    example: 0,
    description: 'Grace period in minutes after session end before auto-ending',
  })
  @Prop({ type: Number, default: 0 })
  autoEndGraceMinutes: number;

  @ApiProperty({
    example: 10,
    description: 'Minutes after session start to mark check-ins as late',
  })
  @Prop({ type: Number, default: 10 })
  lateThresholdMinutes: number;

  @ApiProperty({
    example: 30000,
    description: 'Scheduler check interval in milliseconds',
  })
  @Prop({ type: Number, default: 30000 })
  schedulerIntervalMs: number;
}

export const TimingSettingsSchema = SchemaFactory.createForClass(TimingSettings);

/**
 * Application Settings Schema
 * 
 * Singleton document that stores configurable application settings.
 * These settings can be modified at runtime through the admin dashboard.
 * Values here take precedence over environment variables.
 */
@Schema({ timestamps: true, collection: 'app_settings' })
export class AppSettings {
  @ApiProperty({ description: 'Unique identifier for settings document' })
  @Prop({ type: String, default: 'default', unique: true, index: true })
  settingsId: string;

  @ApiProperty({ description: 'Timing configuration for sessions' })
  @Prop({ type: TimingSettingsSchema, default: () => ({}) })
  timing: TimingSettings;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
