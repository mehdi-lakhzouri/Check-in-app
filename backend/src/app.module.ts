import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PinoLoggerService } from './common/logger';

const logger = new PinoLoggerService();
logger.setContext('AppModule');

// Config
import {
  appConfig,
  databaseConfig,
  throttleConfig,
  uploadConfig,
  redisConfig,
} from './config';

// Database
import { DatabaseModule } from './database';

// Common
import {
  AllExceptionsFilter,
  MongoExceptionFilter,
  TransformInterceptor,
  TimeoutInterceptor,
} from './common';
import { RedisModule } from './common/redis';
import {
  LoggerModule,
  CorrelationIdMiddleware,
  HttpLoggingMiddleware,
  RequestContextMiddleware,
} from './common/logger';

// Feature Modules
import { SessionsModule } from './modules/sessions';
import { ParticipantsModule } from './modules/participants';
import { RegistrationsModule } from './modules/registrations';
import { CheckInsModule } from './modules/checkins';
import { ReportsModule } from './modules/reports';
import { BulkModule } from './modules/bulk';
import { HealthModule } from './modules/health';
import { RealtimeModule } from './modules/realtime';
import { SettingsModule } from './modules/settings';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        throttleConfig,
        uploadConfig,
        redisConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Production Logger (Global)
    LoggerModule,

    // Redis (Global caching and raw client)
    RedisModule,

    // Schedule Module for cron jobs (capacity sync, etc.)
    ScheduleModule.forRoot(),

    // Bull Queue (Redis-backed job queue) with graceful fallback
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD');

        // Log Bull queue configuration
        logger.log(`Bull Queue connecting to Redis at ${host}:${port}`);

        return {
          redis: {
            host,
            port,
            ...(password ? { password } : {}),
            // Add connection options for resilience
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
              if (times > 10) {
                logger.error(
                  'Bull Queue: Max retries reached for Redis connection',
                );
                // Return null to stop retrying (Bull will work in degraded mode)
                return null;
              }
              const delay = Math.min(times * 100, 3000);
              logger.warn(
                `Bull Queue: Redis reconnecting in ${delay}ms (attempt ${times})`,
              );
              return delay;
            },
            enableReadyCheck: false, // Don't block if Redis is slow
            connectTimeout: 5000,
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3, // Retry failed jobs 3 times
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
          settings: {
            stalledInterval: 30000, // Check for stalled jobs every 30s
            maxStalledCount: 3, // Max times a job can be stalled before failing
          },
        };
      },
      inject: [ConfigService],
    }),

    // Rate Limiting - Two-tier protection
    // 1. Long window: 500 req/min (sustained load)
    // 2. Short window: 100 req/10s (burst protection)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get<number>('throttle.short.ttl') ?? 10000,
            limit: config.get<number>('throttle.short.limit') ?? 100,
          },
          {
            name: 'long',
            ttl: config.get<number>('throttle.ttl') ?? 60000,
            limit: config.get<number>('throttle.limit') ?? 500,
          },
        ],
      }),
    }),

    // Database
    DatabaseModule,

    // Feature Modules
    SessionsModule,
    ParticipantsModule,
    RegistrationsModule,
    CheckInsModule,
    ReportsModule,
    BulkModule,
    HealthModule,
    RealtimeModule,
    SettingsModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: MongoExceptionFilter,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply logging middleware to all routes
    // Order matters: CorrelationId → Context → HTTP Logging
    consumer
      .apply(
        CorrelationIdMiddleware,
        RequestContextMiddleware,
        HttpLoggingMiddleware,
      )
      .forRoutes('*');
  }
}
