import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { PinoLoggerService } from '../../../common/logger';
import { SessionDocument } from '../schemas';
import { EntityNotFoundException } from '../../../common/exceptions';

// TYPES
interface CacheWrapper<T> {
  data: T;
  cachedAt: number;
}

const CACHE_KEYS = {
  SESSION_BY_ID: (prefix: string, env: string, id: string) =>
    `${prefix}:${env}:session:byId:${id}`,
  SESSION_STATS: (prefix: string, env: string) =>
    `${prefix}:${env}:session:stats`,
};

@Injectable()
export class SessionCacheService implements OnModuleInit {
  private readonly logger: PinoLoggerService;
  private readonly appPrefix: string;
  private readonly envPrefix: string;
  private readonly sessionTtl: number;
  private readonly statsTtl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SessionCacheService.name);

    this.appPrefix = process.env.REDIS_KEY_PREFIX || 'checkin';
    this.envPrefix = process.env.NODE_ENV || 'development';
    this.sessionTtl = this.configService.get<number>(
      'redis.cache.sessionTtl',
      60000,
    );
    this.statsTtl = this.configService.get<number>(
      'redis.cache.statsTtl',
      30000,
    );
  }

  onModuleInit() {
    this.logger.log('SessionCacheService initialized');
  }

  private getKey(id: string): string {
    return CACHE_KEYS.SESSION_BY_ID(this.appPrefix, this.envPrefix, id);
  }

  private getStatsKey(): string {
    return CACHE_KEYS.SESSION_STATS(this.appPrefix, this.envPrefix);
  }

  /**
   * Get session from cache with sentinel support for nulls
   */
  async getSession(id: string): Promise<SessionDocument | null | undefined> {
    const key = this.getKey(id);
    try {
      const cached =
        await this.cacheManager.get<CacheWrapper<SessionDocument | null>>(key);

      if (
        cached &&
        typeof cached === 'object' &&
        'data' in cached &&
        'cachedAt' in cached
      ) {
        if (cached.data === null) {
          throw new EntityNotFoundException('Session', id);
        }
        this.logger.debug('Cache HIT for session', { sessionId: id });
        return cached.data;
      }
      return undefined; // Cache miss
    } catch (error) {
      if (error instanceof EntityNotFoundException) throw error;
      this.logger.warn('Cache read failed', {
        key,
        error: error.message,
      });
      return undefined;
    }
  }

  /**
   * Set session in cache (with wrapper)
   */
  async setSession(id: string, session: SessionDocument | null): Promise<void> {
    const key = this.getKey(id);
    try {
      await this.cacheManager.set(
        key,
        {
          data: session,
          cachedAt: Date.now(),
        },
        this.sessionTtl,
      );
    } catch (error) {
      this.logger.warn('Cache write failed', {
        key,
        error: error.message,
      });
    }
  }

  async invalidateSession(id: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.getKey(id)),
        this.cacheManager.del(this.getStatsKey()),
      ]);
    } catch (error) {
      this.logger.warn('Cache invalidation failed', {
        sessionId: id,
        error: error.message,
      });
    }
  }

  async getStats<T>(): Promise<T | undefined> {
    const key = this.getStatsKey();
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn('Stats cache read failed', {
        error: error.message,
      });
      return undefined;
    }
  }

  async setStats<T>(stats: T): Promise<void> {
    const key = this.getStatsKey();
    try {
      await this.cacheManager.set(key, stats, this.statsTtl);
    } catch (error) {
      this.logger.warn('Stats cache write failed', {
        error: error.message,
      });
    }
  }
}
