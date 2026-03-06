import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PinoLoggerService } from '../logger';
import { DistributedLockService } from './distributed-lock.service';

@Injectable()
export class RedisSingleflightService {
  private readonly logger: PinoLoggerService;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(forwardRef(() => DistributedLockService))
    private readonly lockService: any,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(RedisSingleflightService.name);
  }

  /**
   * Execute a function with global singleflight protection.
   * Only one pod will execute the factory function for a given key.
   * Others will wait for the result in cache.
   *
   * @param key - Unique key for the operation
   * @param factory - Function to execute if data is missing
   * @param ttl - Cache TTL in milliseconds
   */
  async execute<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    // 1. Fast Path: Check Data Cache
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for ${key}: ${error.message}`);
    }

    // 2. Lock Path: Try to become the fetcher
    // Lock TTL should be slightly longer than expected execution time
    const lockKey = `lock:${key}`;
    const lock = await this.lockService.acquireLock(lockKey, 5000, 3, 100);

    if (lock.acquired) {
      try {
        // Double-check cache in case someone finished just before we got lock
        const cachedAgain = await this.cacheManager.get<T>(key);
        if (cachedAgain !== undefined && cachedAgain !== null) {
          return cachedAgain;
        }

        // I am the leader: fetch and cache
        this.logger.debug(`Acquired lock for ${key}, executing factory`);
        const result = await factory();

        try {
          await this.cacheManager.set(key, result, ttl);
        } catch (error) {
          this.logger.warn(`Cache write failed for ${key}: ${error.message}`);
        }

        return result;
      } finally {
        await lock.releaseLock();
      }
    } else {
      // 3. Follower Path: Wait for leader to finish
      // Poll every 100ms for up to 5 seconds
      this.logger.debug(`Waiting for leader to populate ${key}`);
      return this.waitForResult<T>(key);
    }
  }

  private async waitForResult<T>(key: string, attempt = 1): Promise<T> {
    const maxAttempts = 50; // 5 seconds total (100ms * 50)

    if (attempt > maxAttempts) {
      this.logger.warn(`Timeout waiting for singleflight result: ${key}`);
      throw new Error(`Timeout waiting for operation: ${key}`);
    }

    // Check cache
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.waitForResult(key, attempt + 1);
  }
}
