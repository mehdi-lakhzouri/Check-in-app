import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLoggerService } from '../../../common/logger';
import { SessionRepository } from '../repositories';
import { SessionCacheService } from './session-cache.service';

@Injectable()
export class SessionStatsService implements OnModuleInit {
  private readonly logger: PinoLoggerService;

  // Singleflight map
  private readonly pendingRequests = new Map<string, Promise<any>>();

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SessionStatsService.name);
  }

  onModuleInit() {
    this.logger.log('SessionStatsService initialized');
  }

  /**
   * Singleflight pattern execution
   */
  private async withSingleflight<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = factory().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async getStats(): Promise<{
    total: number;
    open: number;
    upcoming: number;
    past: number;
  }> {
    // 1. Try Cache
    const cached = await this.sessionCacheService.getStats<{
      total: number;
      open: number;
      upcoming: number;
      past: number;
    }>();
    if (cached) return cached;

    // 2. Singleflight DB Fetch
    return this.withSingleflight('stats', async () => {
      // Re-check cache inside lock (double-checked locking optimization)
      const cachedAgain = await this.sessionCacheService.getStats<{
        total: number;
        open: number;
        upcoming: number;
        past: number;
      }>();
      if (cachedAgain) return cachedAgain;

      // DB Fetch
      const stats = await this.sessionRepository.getSessionStats();

      // Write to Cache
      await this.sessionCacheService.setStats(stats);

      return stats;
    });
  }
}
