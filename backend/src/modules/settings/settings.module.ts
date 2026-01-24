import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AppSettings, AppSettingsSchema } from './schemas/app-settings.schema';

/**
 * Settings Module
 *
 * Manages application-wide configuration stored in the database.
 * Provides both read and write access to global timing settings.
 * Administrators can modify settings at runtime through the dashboard.
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AppSettings.name, schema: AppSettingsSchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
