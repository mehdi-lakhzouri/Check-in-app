/**
 * Redis Tokens
 * Separated to avoid circular dependencies between redis.module.ts and services
 */

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_STATUS = 'REDIS_STATUS';

/**
 * Redis connection status tracker
 * Used by health checks and services to determine Redis availability
 */
export interface RedisConnectionStatus {
  cacheConnected: boolean;
  clientConnected: boolean;
  lastError: string | null;
  lastErrorTime: Date | null;
  reconnectAttempts: number;
  usingFallback: boolean;
}
