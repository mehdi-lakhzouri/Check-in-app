/**
 * Test Cache Module
 * In-memory cache implementation for E2E tests
 * Replaces Redis-dependent CacheModule to allow tests to run without infrastructure
 */

import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { REDIS_CLIENT, REDIS_STATUS } from '../../src/common/redis';

/**
 * Fake Redis Status for testing
 */
const testRedisStatus = {
  cacheConnected: true,
  clientConnected: true,
  lastError: null,
  lastErrorTime: null,
  reconnectAttempts: 0,
  usingFallback: false,
};

/**
 * Mock Redis Client for E2E tests
 * Implements the same interface as the real Redis client
 */
class MockRedisClient {
  private store: Map<string, string> = new Map();
  public readonly isNull = false;
  public isOpen = true;

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    const deleted = this.store.delete(key) ? 1 : 0;
    return Promise.resolve(deleted);
  }

  exists(key: string): Promise<number> {
    return Promise.resolve(this.store.has(key) ? 1 : 0);
  }

  incr(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) || '0', 10);
    const newValue = current + 1;
    this.store.set(key, newValue.toString());
    return Promise.resolve(newValue);
  }

  decr(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) || '0', 10);
    const newValue = current - 1;
    this.store.set(key, newValue.toString());
    return Promise.resolve(newValue);
  }

  expire(_key: string, _seconds: number): Promise<boolean> {
    return Promise.resolve(true);
  }

  keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Promise.resolve(
      Array.from(this.store.keys()).filter((key) => regex.test(key)),
    );
  }

  mGet(keys: string[]): Promise<(string | null)[]> {
    return Promise.resolve(keys.map((key) => this.store.get(key) ?? null));
  }

  async *scanIterator(_options?: {
    MATCH?: string;
    COUNT?: number;
  }): AsyncIterableIterator<string> {
    for (const key of this.store.keys()) {
      yield key;
    }
  }

  eval(_script: string, _options: unknown): Promise<number> {
    return Promise.resolve(1); // Default success for capacity checks
  }

  ping(): Promise<string> {
    return Promise.resolve('PONG');
  }

  connect(): Promise<void> {
    this.isOpen = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.isOpen = false;
    return Promise.resolve();
  }

  on(_event: string, _callback: (...args: unknown[]) => void): this {
    return this;
  }

  // Clear all data (useful between tests)
  clear(): void {
    this.store.clear();
  }
}

// Singleton instance for tests
const mockRedisClient = new MockRedisClient();

/**
 * Test Cache Module
 * Provides in-memory cache for E2E tests without Redis dependency
 *
 * Usage:
 * Import this module instead of RedisModule in E2E test setup
 */
@Global()
@Module({
  imports: [
    // In-memory cache store
    CacheModule.register({
      store: 'memory',
      ttl: 60000, // 1 minute default TTL
      max: 1000, // Max entries
    }),
  ],
  providers: [
    {
      provide: REDIS_STATUS,
      useValue: testRedisStatus,
    },
    {
      provide: REDIS_CLIENT,
      useValue: mockRedisClient,
    },
  ],
  exports: [CacheModule, REDIS_STATUS, REDIS_CLIENT],
})
export class TestCacheModule {
  /**
   * Get the mock Redis client instance for direct manipulation in tests
   */
  static getMockClient(): MockRedisClient {
    return mockRedisClient;
  }

  /**
   * Clear all cached data (call in afterEach)
   */
  static clearCache(): void {
    mockRedisClient.clear();
  }
}
