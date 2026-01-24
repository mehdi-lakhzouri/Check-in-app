import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  AppSettings,
  AppSettingsDocument,
  TimingSettings,
} from './schemas/app-settings.schema';
import { UpdateTimingSettingsDto, UpdateSessionTimingDto } from './dto';
import { PinoLoggerService } from '../../common/logger';

/**
 * Global timing configuration exposed to the API
 */
export interface GlobalTimingConfig {
  /** Minutes before session start to auto-open check-in */
  autoOpenMinutesBefore: number;
  /** Whether auto-end is enabled */
  autoEndEnabled: boolean;
  /** Grace period in minutes after session end before auto-ending */
  autoEndGraceMinutes: number;
  /** Minutes after session start to mark check-ins as late */
  lateThresholdMinutes: number;
  /** Scheduler check interval in milliseconds */
  schedulerIntervalMs: number;
}

/**
 * Complete application settings response
 */
export interface ApplicationSettings {
  timing: GlobalTimingConfig;
  version: string;
  environment: string;
}

/**
 * Session timing info for display
 */
export interface SessionTimingInfo {
  sessionId: string;
  sessionName: string;
  autoOpenMinutesBefore: number | null;
  autoEndGraceMinutes: number | null;
  lateThresholdMinutes: number | null;
  usesCustomTiming: boolean;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger: PinoLoggerService;
  private cachedSettings: AppSettingsDocument | null = null;

  constructor(
    @InjectModel(AppSettings.name)
    private readonly settingsModel: Model<AppSettingsDocument>,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SettingsService.name);
  }

  /**
   * Initialize settings on module startup
   * Creates default settings document if it doesn't exist
   */
  async onModuleInit(): Promise<void> {
    await this.ensureSettingsExist();
    this.logger.log('Settings service initialized');
  }

  /**
   * Ensure settings document exists, create with env defaults if not
   */
  private async ensureSettingsExist(): Promise<AppSettingsDocument> {
    let settings = await this.settingsModel.findOne({ settingsId: 'default' });

    if (!settings) {
      this.logger.log('Creating default settings from environment variables');
      settings = await this.settingsModel.create({
        settingsId: 'default',
        timing: {
          autoOpenMinutesBefore: this.configService.get<number>(
            'sessionScheduler.autoOpenMinutesBefore',
            10,
          ),
          autoEndEnabled: this.configService.get<boolean>(
            'sessionScheduler.autoEndEnabled',
            true,
          ),
          autoEndGraceMinutes: this.configService.get<number>(
            'sessionScheduler.autoEndGraceMinutes',
            0,
          ),
          lateThresholdMinutes: this.configService.get<number>(
            'app.checkinLateThresholdMinutes',
            10,
          ),
          schedulerIntervalMs: this.configService.get<number>(
            'sessionScheduler.checkIntervalMs',
            30000,
          ),
        },
      });
    }

    this.cachedSettings = settings;
    return settings;
  }

  /**
   * Get the settings document (with caching)
   */
  private async getSettings(): Promise<AppSettingsDocument> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }
    return this.ensureSettingsExist();
  }

  /**
   * Invalidate the cached settings
   */
  private invalidateCache(): void {
    this.cachedSettings = null;
  }

  /**
   * Get global timing configuration from database
   */
  async getGlobalTimingConfig(): Promise<GlobalTimingConfig> {
    const settings = await this.getSettings();
    return {
      autoOpenMinutesBefore: settings.timing.autoOpenMinutesBefore,
      autoEndEnabled: settings.timing.autoEndEnabled,
      autoEndGraceMinutes: settings.timing.autoEndGraceMinutes,
      lateThresholdMinutes: settings.timing.lateThresholdMinutes,
      schedulerIntervalMs: settings.timing.schedulerIntervalMs,
    };
  }

  /**
   * Update global timing configuration
   */
  async updateTimingConfig(
    dto: UpdateTimingSettingsDto,
  ): Promise<GlobalTimingConfig> {
    this.logger.log('Updating global timing configuration', dto);

    const updateFields: Partial<TimingSettings> = {};

    if (dto.autoOpenMinutesBefore !== undefined) {
      updateFields.autoOpenMinutesBefore = dto.autoOpenMinutesBefore;
    }
    if (dto.autoEndEnabled !== undefined) {
      updateFields.autoEndEnabled = dto.autoEndEnabled;
    }
    if (dto.autoEndGraceMinutes !== undefined) {
      updateFields.autoEndGraceMinutes = dto.autoEndGraceMinutes;
    }
    if (dto.lateThresholdMinutes !== undefined) {
      updateFields.lateThresholdMinutes = dto.lateThresholdMinutes;
    }

    const settings = await this.settingsModel.findOneAndUpdate(
      { settingsId: 'default' },
      {
        $set: Object.fromEntries(
          Object.entries(updateFields).map(([key, value]) => [
            `timing.${key}`,
            value,
          ]),
        ),
      },
      { new: true, upsert: true },
    );

    this.invalidateCache();
    this.cachedSettings = settings;

    this.logger.log('Global timing configuration updated successfully');

    return this.getGlobalTimingConfig();
  }

  /**
   * Get complete application settings
   */
  async getApplicationSettings(): Promise<ApplicationSettings> {
    const timing = await this.getGlobalTimingConfig();
    return {
      timing,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
    };
  }

  /**
   * Get timing value with fallback to global config
   * Used by scheduler and check-in service
   */
  async getAutoOpenMinutes(sessionValue?: number | null): Promise<number> {
    if (sessionValue !== undefined && sessionValue !== null) {
      return sessionValue;
    }
    const config = await this.getGlobalTimingConfig();
    return config.autoOpenMinutesBefore;
  }

  async getAutoEndGraceMinutes(sessionValue?: number | null): Promise<number> {
    if (sessionValue !== undefined && sessionValue !== null) {
      return sessionValue;
    }
    const config = await this.getGlobalTimingConfig();
    return config.autoEndGraceMinutes;
  }

  async getLateThresholdMinutes(sessionValue?: number | null): Promise<number> {
    if (sessionValue !== undefined && sessionValue !== null) {
      return sessionValue;
    }
    const config = await this.getGlobalTimingConfig();
    return config.lateThresholdMinutes;
  }

  async isAutoEndEnabled(): Promise<boolean> {
    const config = await this.getGlobalTimingConfig();
    return config.autoEndEnabled;
  }
}
