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

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key) ? 1 : 0;
    return deleted;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) || '0', 10);
    const newValue = current + 1;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) || '0', 10);
    const newValue = current - 1;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  async expire(_key: string, _seconds: number): Promise<boolean> {
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  async mGet(keys: string[]): Promise<(string | null)[]> {
    return keys.map((key) => this.store.get(key) ?? null);
  }

  async *scanIterator(_options?: {
    MATCH?: string;
    COUNT?: number;
  }): AsyncIterableIterator<string> {
    for (const key of this.store.keys()) {
      yield key;
    }
  }

  async eval(_script: string, _options: any): Promise<any> {
    return 1; // Default success for capacity checks
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async connect(): Promise<void> {
    this.isOpen = true;
  }

  async disconnect(): Promise<void> {
    this.isOpen = false;
  }

  on(_event: string, _callback: Function): this {
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
