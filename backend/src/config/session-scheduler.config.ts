import { registerAs } from '@nestjs/config';

/**
 * Session Scheduler Configuration
 * 
 * Controls automatic session opening/closing behavior:
 * - AUTO_OPEN_MINUTES_BEFORE: Minutes before startTime to auto-open sessions
 * - CHECK_INTERVAL_MS: How often the scheduler checks for sessions to update
 * - AUTO_END_ENABLED: Whether to automatically end sessions after endTime
 */
export default registerAs('sessionScheduler', () => ({
  // Minutes before session start time to automatically open for check-in
  autoOpenMinutesBefore: parseInt(
    process.env.AUTO_OPEN_MINUTES_BEFORE ?? '10',
    10
  ),
  
  // How often to check for sessions that need status updates (in milliseconds)
  // Default: 30 seconds (30000ms)
  checkIntervalMs: parseInt(
    process.env.SESSION_CHECK_INTERVAL_MS ?? '30000',
    10
  ),
  
  // Whether to automatically end sessions after their endTime
  autoEndEnabled: process.env.AUTO_END_ENABLED !== 'false',
  
  // Grace period after endTime before auto-ending (in minutes)
  // Allows some buffer for late check-ins
  autoEndGraceMinutes: parseInt(
    process.env.AUTO_END_GRACE_MINUTES ?? '0',
    10
  ),
}));
