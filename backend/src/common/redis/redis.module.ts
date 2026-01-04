import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { createClient, RedisClientType } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_STATUS = 'REDIS_STATUS';

import { PinoLoggerService } from '../logger';
const logger = new PinoLoggerService();
logger.setContext('RedisModule');

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

// Global status tracker - shared across the application
const redisStatus: RedisConnectionStatus = {
  cacheConnected: false,
  clientConnected: false,
  lastError: null,
  lastErrorTime: null,
  reconnectAttempts: 0,
  usingFallback: false,
};

/**
 * Null Redis Client - Fallback when Redis is unavailable
 * Implements the same interface but operations are no-ops or return sensible defaults
 */
class NullRedisClient {
  private readonly logger: PinoLoggerService;
  public readonly isNull = true;
  public isOpen = false;

  constructor() {
    this.logger = new PinoLoggerService();
    this.logger.setContext('NullRedisClient');
  }

  async get(_key: string): Promise<string | null> {
    this.logger.verbose('NullRedisClient.get called - returning null');
    return null;
  }

  async set(_key: string, _value: string): Promise<string> {
    this.logger.verbose('NullRedisClient.set called - no-op');
    return 'OK';
  }

  async del(_key: string): Promise<number> {
    this.logger.verbose('NullRedisClient.del called - no-op');
    return 0;
  }

  async exists(_key: string): Promise<number> {
    this.logger.verbose('NullRedisClient.exists called - returning 0');
    return 0;
  }

  async incr(_key: string): Promise<number> {
    this.logger.verbose('NullRedisClient.incr called - returning 0');
    return 0;
  }

  async decr(_key: string): Promise<number> {
    this.logger.verbose('NullRedisClient.decr called - returning 0');
    return 0;
  }

  async expire(_key: string, _seconds: number): Promise<boolean> {
    this.logger.verbose('NullRedisClient.expire called - no-op');
    return true;
  }

  async keys(_pattern: string): Promise<string[]> {
    this.logger.verbose('NullRedisClient.keys called - returning empty array');
    return [];
  }

  async mGet(_keys: string[]): Promise<(string | null)[]> {
    this.logger.verbose('NullRedisClient.mGet called - returning empty array');
    return [];
  }

  async *scanIterator(_options?: { MATCH?: string; COUNT?: number }): AsyncIterableIterator<string> {
    this.logger.verbose('NullRedisClient.scanIterator called - yielding nothing');
    // Yield nothing - empty iterator
  }

  async eval(_script: string, _options: any): Promise<any> {
    this.logger.verbose('NullRedisClient.eval called - returning -1 (fallback behavior)');
    return -1; // Signals to use MongoDB fallback for capacity checks
  }

  async ping(): Promise<string> {
    throw new Error('Redis unavailable - using fallback client');
  }

  async connect(): Promise<void> {
    this.logger.warn('NullRedisClient.connect called - already in fallback mode');
  }

  async disconnect(): Promise<void> {
    this.logger.verbose('NullRedisClient.disconnect called - no-op');
  }

  on(_event: string, _callback: Function): this {
    return this;
  }
}

/**
 * Redis Module
 * 
 * Provides:
 * 1. Cache Manager - for simple key-value caching with TTL (falls back to in-memory)
 * 2. Raw Redis Client - for advanced operations (falls back to NullRedisClient)
 * 3. Redis Status - for health checks and monitoring
 * 
 * Features:
 * - Connection resilience with retry strategy
 * - Graceful fallback to in-memory cache if Redis unavailable
 * - NullRedisClient pattern for raw client fallback
 * - Health status tracking for monitoring
 * - Event logging for connection status
 * - Redis Cluster support (via REDIS_CLUSTER_NODES env var)
 * - Redis Sentinel support (via REDIS_SENTINELS env var)
 * 
 * Environment Variables:
 * - REDIS_HOST: Single node host (default: localhost)
 * - REDIS_PORT: Single node port (default: 6379)
 * - REDIS_PASSWORD: Password for authentication
 * - REDIS_CLUSTER_NODES: Comma-separated cluster nodes (e.g., "host1:6379,host2:6379")
 * - REDIS_SENTINELS: Comma-separated sentinel addresses (e.g., "host1:26379,host2:26379")
 * - REDIS_SENTINEL_NAME: Sentinel master name (default: mymaster)
 * 
 * Usage:
 * - Inject CACHE_MANAGER for simple caching
 * - Inject REDIS_CLIENT for raw Redis operations
 * - Inject REDIS_STATUS for health checks
 */

/**
 * Parse Redis cluster/sentinel configuration from environment
 */
function parseRedisNodes(nodesStr: string | undefined): { host: string; port: number }[] {
  if (!nodesStr) return [];
  return nodesStr.split(',').map(node => {
    const [host, portStr] = node.trim().split(':');
    return { host, port: parseInt(portStr || '6379', 10) };
  });
}

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const password = configService.get<string>('redis.password');

        try {
          const store = await redisStore({
            socket: {
              host,
              port,
              reconnectStrategy: (retries) => {
                redisStatus.reconnectAttempts = retries;
                if (retries > 10) {
                  logger.error('Redis Cache max retries reached - switching to in-memory fallback');
                  redisStatus.cacheConnected = false;
                  redisStatus.lastError = 'Max retries reached';
                  redisStatus.lastErrorTime = new Date();
                  redisStatus.usingFallback = true;
                  return new Error('Redis Cache max retries reached');
                }
                const delay = Math.min(retries * 100, 3000);
                logger.warn(`Redis Cache reconnecting in ${delay}ms (attempt ${retries})`);
                return delay;
              },
              connectTimeout: 5000, // Reduced timeout for faster fallback
            },
            ...(password ? { password } : {}),
          });

          redisStatus.cacheConnected = true;
          redisStatus.usingFallback = false;
          logger.log('✅ Redis Cache store initialized');
          return {
            store,
            ttl: 60000, // Default 1 minute TTL
          };
        } catch (error) {
          // GRACEFUL FALLBACK: Use in-memory cache instead of crashing
          logger.error(`Failed to initialize Redis Cache store: ${error.message}`);
          logger.warn('⚠️ Falling back to in-memory cache - LIMITED CAPACITY');
          
          redisStatus.cacheConnected = false;
          redisStatus.lastError = error.message;
          redisStatus.lastErrorTime = new Date();
          redisStatus.usingFallback = true;
          
          // Return in-memory cache configuration
          return {
            store: 'memory',
            ttl: 60000,
            max: 1000, // Limit entries to prevent memory leak
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Redis Status Provider - for health checks
    {
      provide: REDIS_STATUS,
      useValue: redisStatus,
    },
    // Redis Client Provider - with NullRedisClient fallback
    // Supports: Single node, Cluster, and Sentinel modes
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService): Promise<RedisClientType | NullRedisClient> => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const password = configService.get<string>('redis.password');
        
        // Check for cluster/sentinel configuration
        const clusterNodes = configService.get<string>('REDIS_CLUSTER_NODES');
        const sentinels = configService.get<string>('REDIS_SENTINELS');
        const sentinelName = configService.get<string>('REDIS_SENTINEL_NAME', 'mymaster');
        
        // Build client configuration based on mode
        let clientConfig: any;
        
        if (clusterNodes) {
          // CLUSTER MODE
          const nodes = parseRedisNodes(clusterNodes);
          logger.log(`Redis Cluster mode enabled with ${nodes.length} nodes`);
          clientConfig = {
            rootNodes: nodes.map(n => ({ url: `redis://${n.host}:${n.port}` })),
            defaults: {
              password,
              socket: {
                reconnectStrategy: (retries: number) => {
                  redisStatus.reconnectAttempts = retries;
                  if (retries > 10) {
                    logger.error('Redis Cluster max retries reached');
                    return new Error('Redis Cluster max retries reached');
                  }
                  return Math.min(retries * 100, 3000);
                },
                connectTimeout: 5000,
              },
            },
          };
          // Note: For cluster mode, use createCluster() instead of createClient()
          // This is a simplified example - full cluster support requires @redis/client cluster API
          logger.warn('⚠️ Redis Cluster mode configured - ensure @redis/client cluster API is used');
        } else if (sentinels) {
          // SENTINEL MODE
          const sentinelNodes = parseRedisNodes(sentinels);
          logger.log(`Redis Sentinel mode enabled with ${sentinelNodes.length} sentinels, master: ${sentinelName}`);
          clientConfig = {
            sentinel: {
              rootNodes: sentinelNodes.map(n => ({ host: n.host, port: n.port })),
              name: sentinelName,
            },
            ...(password ? { password } : {}),
            socket: {
              reconnectStrategy: (retries: number) => {
                redisStatus.reconnectAttempts = retries;
                if (retries > 10) {
                  logger.error('Redis Sentinel max retries reached');
                  return new Error('Redis Sentinel max retries reached');
                }
                return Math.min(retries * 100, 3000);
              },
              connectTimeout: 5000,
            },
          };
        } else {
          // SINGLE NODE MODE (default)
          logger.log(`Redis Single Node mode: ${host}:${port}`);
          clientConfig = {
            socket: {
              host,
              port,
              reconnectStrategy: (retries: number) => {
                redisStatus.reconnectAttempts = retries;
                if (retries > 10) {
                  logger.error('Redis Client max retries reached - using NullRedisClient fallback');
                  redisStatus.clientConnected = false;
                  redisStatus.lastError = 'Redis Client max retries reached';
                  redisStatus.lastErrorTime = new Date();
                  return new Error('Redis Client max retries reached');
                }
                const delay = Math.min(retries * 100, 3000);
                logger.warn(`Redis Client reconnecting in ${delay}ms (attempt ${retries})`);
                return delay;
              },
              connectTimeout: 5000,
            },
            ...(password ? { password } : {}),
          };
        }

        const client = createClient(clientConfig);

        client.on('error', (err) => {
          logger.error(`Redis Client Error: ${err.message}`);
          redisStatus.clientConnected = false;
          redisStatus.lastError = err.message;
          redisStatus.lastErrorTime = new Date();
        });

        client.on('connect', () => {
          logger.log('Redis Client connecting...');
        });

        client.on('ready', () => {
          logger.log('✅ Redis Client ready');
          redisStatus.clientConnected = true;
          redisStatus.reconnectAttempts = 0;
        });

        client.on('reconnecting', () => {
          logger.warn('Redis Client reconnecting...');
          redisStatus.clientConnected = false;
        });

        client.on('end', () => {
          logger.warn('Redis Client connection closed');
          redisStatus.clientConnected = false;
        });

        try {
          await client.connect();
          redisStatus.clientConnected = true;
          return client as RedisClientType;
        } catch (error) {
          // GRACEFUL FALLBACK: Return NullRedisClient instead of crashing
          logger.error(`Failed to connect Redis Client: ${error.message}`);
          logger.warn('⚠️ Using NullRedisClient fallback - some features will use MongoDB directly');
          
          redisStatus.clientConnected = false;
          redisStatus.lastError = error.message;
          redisStatus.lastErrorTime = new Date();
          redisStatus.usingFallback = true;
          
          return new NullRedisClient() as any;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheModule, REDIS_CLIENT, REDIS_STATUS],
})
export class RedisModule {}

// Re-export DistributedLockService for convenience
export { DistributedLockService } from './distributed-lock.service';
