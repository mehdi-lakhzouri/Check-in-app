import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import type { GlobalTimingConfig, ApplicationSettings } from './settings.service';
import { UpdateTimingSettingsDto } from './dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get global timing configuration
   * Returns system-wide defaults for session timing
   */
  @Get('timing')
  @ApiOperation({
    summary: 'Get global timing configuration',
    description:
      'Returns the system-wide default timing settings. These values are used when sessions do not have custom timing overrides configured.',
  })
  @ApiResponse({
    status: 200,
    description: 'Global timing configuration',
    schema: {
      type: 'object',
      properties: {
        autoOpenMinutesBefore: {
          type: 'number',
          example: 10,
          description: 'Minutes before session start to auto-open check-in',
        },
        autoEndEnabled: {
          type: 'boolean',
          example: true,
          description: 'Whether automatic session ending is enabled',
        },
        autoEndGraceMinutes: {
          type: 'number',
          example: 0,
          description:
            'Grace period in minutes after session end before auto-ending',
        },
        lateThresholdMinutes: {
          type: 'number',
          example: 10,
          description: 'Minutes after session start to mark check-ins as late',
        },
        schedulerIntervalMs: {
          type: 'number',
          example: 30000,
          description: 'How often the scheduler checks for session updates (ms)',
        },
      },
    },
  })
  async getTimingConfig(): Promise<GlobalTimingConfig> {
    return this.settingsService.getGlobalTimingConfig();
  }

  /**
   * Update global timing configuration
   */
  @Put('timing')
  @ApiOperation({
    summary: 'Update global timing configuration',
    description:
      'Updates the system-wide default timing settings. Only provided fields will be updated.',
  })
  @ApiBody({ type: UpdateTimingSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Updated timing configuration',
  })
  async updateTimingConfig(
    @Body() dto: UpdateTimingSettingsDto,
  ): Promise<GlobalTimingConfig> {
    return this.settingsService.updateTimingConfig(dto);
  }

  /**
   * Get complete application settings
   */
  @Get()
  @ApiOperation({
    summary: 'Get application settings',
    description:
      'Returns complete application settings including timing configuration, version, and environment info.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application settings',
    schema: {
      type: 'object',
      properties: {
        timing: {
          type: 'object',
          description: 'Global timing configuration',
        },
        version: {
          type: 'string',
          example: '1.0.0',
          description: 'Application version',
        },
        environment: {
          type: 'string',
          example: 'production',
          description: 'Current environment',
        },
      },
    },
  })
  async getSettings(): Promise<ApplicationSettings> {
    return this.settingsService.getApplicationSettings();
  }
}
