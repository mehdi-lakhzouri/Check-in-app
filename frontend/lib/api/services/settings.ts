/**
 * Settings API Service
 * Handles fetching global application settings and timing configuration
 */

import { api } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

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

export interface ApplicationSettings {
  timing: GlobalTimingConfig;
  version: string;
  environment: string;
}

export interface UpdateTimingConfigPayload {
  autoOpenMinutesBefore?: number;
  autoEndEnabled?: boolean;
  autoEndGraceMinutes?: number;
  lateThresholdMinutes?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get global timing configuration
 */
async function getTimingConfig(): Promise<GlobalTimingConfig> {
  const response = await api.get<GlobalTimingConfig>('/settings/timing');
  return response;
}

/**
 * Get complete application settings
 */
async function getSettings(): Promise<ApplicationSettings> {
  const response = await api.get<ApplicationSettings>('/settings');
  return response;
}

/**
 * Update global timing configuration
 */
async function updateTimingConfig(payload: UpdateTimingConfigPayload): Promise<GlobalTimingConfig> {
  const response = await api.put<GlobalTimingConfig>('/settings/timing', payload);
  return response;
}

/**
 * Update timing for a specific session
 * Uses the existing session update endpoint
 */
async function updateSessionTiming(
  sessionId: string, 
  timing: Partial<UpdateTimingConfigPayload>
): Promise<{ message: string }> {
  // Use the session update endpoint with only timing fields
  await api.patch(`/sessions/${sessionId}`, {
    autoOpenMinutesBefore: timing.autoOpenMinutesBefore,
    lateThresholdMinutes: timing.lateThresholdMinutes,
    autoEndGraceMinutes: timing.autoEndGraceMinutes,
  });
  return { message: 'Session timing updated successfully' };
}

// ============================================================================
// Service Export
// ============================================================================

export const settingsService = {
  getTimingConfig,
  getSettings,
  updateTimingConfig,
  updateSessionTiming,
};
