import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import { REDIS_STATUS } from '../../common/redis/redis.module';
import type { RedisConnectionStatus } from '../../common/redis/redis.module';

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    name: string;
  };
  redis: {
    status: 'connected' | 'degraded' | 'disconnected';
    cache: 'connected' | 'disconnected';
    client: 'connected' | 'disconnected';
    usingFallback: boolean;
    lastError: string | null;
    lastErrorTime: string | null;
    reconnectAttempts: number;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
}

@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Health checks should never be rate limited
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(REDIS_STATUS) private readonly redisStatus: RedisConnectionStatus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint with full system status' })
  @ApiOkResponse({
    description: 'Application health status including database and Redis',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected'] },
            name: { type: 'string' },
          },
        },
        redis: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['connected', 'degraded', 'disconnected'],
            },
            cache: { type: 'string', enum: ['connected', 'disconnected'] },
            client: { type: 'string', enum: ['connected', 'disconnected'] },
            usingFallback: { type: 'boolean' },
            lastError: { type: 'string', nullable: true },
            lastErrorTime: { type: 'string', nullable: true },
            reconnectAttempts: { type: 'number' },
          },
        },
        memory: {
          type: 'object',
          properties: {
            heapUsed: { type: 'string' },
            heapTotal: { type: 'string' },
            rss: { type: 'string' },
          },
        },
      },
    },
  })
  check(): HealthCheckResponse {
    const memoryUsage = process.memoryUsage();

    const formatBytes = (bytes: number): string => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };

    const dbConnected = this.connection.readyState === 1;
    const redisCacheConnected = this.redisStatus.cacheConnected;
    const redisClientConnected = this.redisStatus.clientConnected;
    const redisFullyConnected = redisCacheConnected && redisClientConnected;

    // Determine Redis status
    let redisOverallStatus: 'connected' | 'degraded' | 'disconnected';
    if (redisFullyConnected) {
      redisOverallStatus = 'connected';
    } else if (redisCacheConnected || redisClientConnected) {
      redisOverallStatus = 'degraded';
    } else {
      redisOverallStatus = 'disconnected';
    }

    // Determine overall system status
    let overallStatus: 'ok' | 'degraded' | 'error';
    if (dbConnected && redisFullyConnected) {
      overallStatus = 'ok';
    } else if (dbConnected) {
      // DB is up, Redis is down or degraded - system works but in degraded mode
      overallStatus = 'degraded';
    } else {
      // DB is down - critical error
      overallStatus = 'error';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbConnected ? 'connected' : 'disconnected',
        name: this.connection.name,
      },
      redis: {
        status: redisOverallStatus,
        cache: redisCacheConnected ? 'connected' : 'disconnected',
        client: redisClientConnected ? 'connected' : 'disconnected',
        usingFallback: this.redisStatus.usingFallback,
        lastError: this.redisStatus.lastError,
        lastErrorTime: this.redisStatus.lastErrorTime?.toISOString() || null,
        reconnectAttempts: this.redisStatus.reconnectAttempts,
      },
      memory: {
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        rss: formatBytes(memoryUsage.rss),
      },
    };
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe - checks if application is running',
  })
  @ApiOkResponse({ description: 'Application is live' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe - checks if application can serve requests',
  })
  @ApiOkResponse({ description: 'Application readiness status' })
  ready(): {
    status: 'ok' | 'degraded' | 'error';
    database: string;
    redis: string;
    details: string;
  } {
    const dbReady = this.connection.readyState === 1;
    const redisReady =
      this.redisStatus.cacheConnected || this.redisStatus.clientConnected;

    let status: 'ok' | 'degraded' | 'error';
    let details: string;

    if (dbReady && redisReady && !this.redisStatus.usingFallback) {
      status = 'ok';
      details = 'All systems operational';
    } else if (dbReady && this.redisStatus.usingFallback) {
      status = 'degraded';
      details =
        'Redis using fallback - some features may have reduced performance';
    } else if (dbReady && !redisReady) {
      status = 'degraded';
      details = 'Redis disconnected - using in-memory fallback';
    } else {
      status = 'error';
      details = 'Database connection failed';
    }

    return {
      status,
      database: dbReady ? 'connected' : 'disconnected',
      redis: redisReady
        ? this.redisStatus.usingFallback
          ? 'fallback'
          : 'connected'
        : 'disconnected',
      details,
    };
  }
}
