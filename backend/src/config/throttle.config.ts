import { registerAs } from '@nestjs/config';

/**
 * Rate Limiting Configuration
 *
 * Designed for event check-in scenarios:
 * - 10 officers scanning simultaneously
 * - Each officer: ~20-30 requests/minute
 * - Shared WiFi (same IP for all officers)
 * - Dashboard viewers refreshing stats
 *
 * Total realistic load: ~300-500 requests/minute from single IP
 */
export default registerAs('throttle', () => ({
  // Default: 500 requests per minute per IP
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '500', 10),

  // Short burst protection: 300 requests per 10 seconds
  // (10 officers × 5 API calls each = 50 req/burst, with room for spikes)
  short: {
    ttl: parseInt(process.env.THROTTLE_SHORT_TTL ?? '10000', 10),
    limit: parseInt(process.env.THROTTLE_SHORT_LIMIT ?? '300', 10),
  },

  // Endpoint-specific limits (can be used with @Throttle decorator)
  endpoints: {
    // Check-in endpoints: higher limits for scanning
    checkin: {
      ttl: 60000,
      limit: 300, // 5 scans/sec sustained
    },
    // Health checks: very high limit (for monitoring)
    health: {
      ttl: 60000,
      limit: 1000,
    },
    // Read endpoints: moderate limits
    read: {
      ttl: 60000,
      limit: 500,
    },
    // Write endpoints: lower limits
    write: {
      ttl: 60000,
      limit: 200,
    },
  },
}));
