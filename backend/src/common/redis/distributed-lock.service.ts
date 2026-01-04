import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.module';
import type { RedisClientType } from 'redis';
import { PinoLoggerService } from '../logger';

/**
 * Lock acquisition result
 */
export interface LockResult {
  acquired: boolean;
  lockId: string | null;
  releaseLock: () => Promise<void>;
}

/**
 * Lua script for atomic lock release (only release if we own the lock)
 * This prevents releasing a lock acquired by another process
 */
const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

/**
 * Distributed Lock Service
 * 
 * Provides Redis-based distributed locking for multi-instance safety.
 * Uses the Redlock algorithm pattern for reliable distributed locks.
 * 
 * Features:
 * - Atomic lock acquisition with TTL (auto-expiry)
 * - Safe release (only owner can release)
 * - Graceful fallback when Redis unavailable
 * - Lock ID tracking for ownership verification
 * 
 * Usage:
 * ```typescript
 * const lock = await this.lockService.acquireLock('myResource', 5000);
 * if (lock.acquired) {
 *   try {
 *     // Critical section
 *   } finally {
 *     await lock.releaseLock();
 *   }
 * }
 * ```
 */
@Injectable()
export class DistributedLockService implements OnModuleInit {
  private readonly logger: PinoLoggerService;
  private readonly lockPrefix = 'lock:';

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(DistributedLockService.name);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('DistributedLockService initialized');
  }

  /**
   * Check if Redis is available for locking
   */
  private isRedisAvailable(): boolean {
    if (!this.redisClient) return false;
    if ((this.redisClient as any).isNull) return false;
    return (this.redisClient as any).isOpen === true;
  }

  /**
   * Generate a unique lock ID for ownership tracking
   */
  private generateLockId(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Acquire a distributed lock
   * 
   * @param resource - The resource to lock (e.g., 'checkin:session:123')
   * @param ttlMs - Lock TTL in milliseconds (auto-expires after this time)
   * @param retryCount - Number of retry attempts (default: 3)
   * @param retryDelayMs - Delay between retries in milliseconds (default: 100)
   * @returns LockResult with acquired status and release function
   */
  async acquireLock(
    resource: string,
    ttlMs: number = 5000,
    retryCount: number = 3,
    retryDelayMs: number = 100,
  ): Promise<LockResult> {
    // Graceful fallback when Redis unavailable
    if (!this.isRedisAvailable()) {
      this.logger.debug(`Redis unavailable, skipping distributed lock for ${resource}`);
      return {
        acquired: true, // Allow operation to proceed (single-instance mode)
        lockId: null,
        releaseLock: async () => {}, // No-op release
      };
    }

    const lockKey = `${this.lockPrefix}${resource}`;
    const lockId = this.generateLockId();

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Atomic SET NX EX (set if not exists with expiry)
        const result = await this.redisClient.set(lockKey, lockId, {
          NX: true, // Only set if not exists
          PX: ttlMs, // Expiry in milliseconds
        });

        if (result === 'OK') {
          this.logger.debug(`Lock acquired: ${resource} (lockId: ${lockId})`);
          return {
            acquired: true,
            lockId,
            releaseLock: () => this.releaseLock(resource, lockId),
          };
        }

        // Lock held by another process, wait and retry
        if (attempt < retryCount - 1) {
          await this.sleep(retryDelayMs);
        }
      } catch (error) {
        this.logger.warn(`Lock acquisition error for ${resource}: ${error.message}`);
        // On error, allow operation to proceed (degraded mode)
        if (attempt === retryCount - 1) {
          return {
            acquired: true, // Allow operation (best effort)
            lockId: null,
            releaseLock: async () => {},
          };
        }
      }
    }

    // Failed to acquire lock after all retries
    this.logger.warn(`Failed to acquire lock for ${resource} after ${retryCount} attempts`);
    return {
      acquired: false,
      lockId: null,
      releaseLock: async () => {},
    };
  }

  /**
   * Release a distributed lock
   * Only releases if the lockId matches (ownership verification)
   */
  private async releaseLock(resource: string, lockId: string): Promise<void> {
    if (!this.isRedisAvailable() || !lockId) {
      return; // Nothing to release
    }

    const lockKey = `${this.lockPrefix}${resource}`;

    try {
      const result = await this.redisClient.eval(RELEASE_LOCK_SCRIPT, {
        keys: [lockKey],
        arguments: [lockId],
      });

      if (result === 1) {
        this.logger.debug(`Lock released: ${resource} (lockId: ${lockId})`);
      } else {
        this.logger.warn(`Lock release failed (not owner): ${resource}`);
      }
    } catch (error) {
      this.logger.warn(`Lock release error for ${resource}: ${error.message}`);
    }
  }

  /**
   * Execute a function with a distributed lock
   * Automatically acquires and releases the lock
   * 
   * @param resource - The resource to lock
   * @param fn - The function to execute within the lock
   * @param ttlMs - Lock TTL in milliseconds
   * @returns The result of the function, or null if lock not acquired
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttlMs: number = 5000,
  ): Promise<T | null> {
    const lock = await this.acquireLock(resource, ttlMs);

    if (!lock.acquired) {
      this.logger.warn(`Could not acquire lock for ${resource}, skipping operation`);
      return null;
    }

    try {
      return await fn();
    } finally {
      await lock.releaseLock();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
