/**
 * E2E Test Setup Module
 * Provides a complete test application setup for E2E tests
 * Includes all necessary modules with in-memory cache (no Redis required)
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { TestCacheModule } from './test-cache.module';

// Feature Modules
import { SessionsModule } from '../../src/modules/sessions';
import { ParticipantsModule } from '../../src/modules/participants';
import { RegistrationsModule } from '../../src/modules/registrations';
import { CheckInsModule } from '../../src/modules/checkins';
import { ReportsModule } from '../../src/modules/reports';
import { BulkModule } from '../../src/modules/bulk';
import { HealthModule } from '../../src/modules/health';

// Queue name from processor
const SESSION_SCHEDULER_QUEUE = 'session-scheduler';

/**
 * Creates a mock Bull Queue with all methods required by SessionSchedulerService
 */
function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn().mockResolvedValue(undefined),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    getPausedCount: jest.fn().mockResolvedValue(0),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
  };
}

export interface E2ETestContext {
  app: INestApplication;
  mongoServer: MongoMemoryServer;
  connection: Connection;
  module: TestingModule;
}

/**
 * Default test configuration
 */
const testConfig = () => ({
  app: {
    checkinLateThresholdMinutes: 10,
    port: 3000,
    apiVersion: '1',
  },
  database: {
    uri: 'mongodb://localhost:27017/test',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
  throttle: {
    ttl: 60,
    limit: 100,
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModuleType = any;

/**
 * Create a complete E2E test application
 * Includes all modules with in-memory cache (no Redis dependency)
 *
 * @param additionalModules - Additional modules to import
 * @returns E2ETestContext with app, mongo server, and connection
 */
export async function createE2ETestApp(
  additionalModules: ModuleType[] = [],
): Promise<E2ETestContext> {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      // Configuration
      ConfigModule.forRoot({
        isGlobal: true,
        load: [testConfig],
      }),

      // Database
      MongooseModule.forRoot(mongoUri),

      // In-memory Cache (replaces Redis)
      TestCacheModule,

      // Schedule (for cron jobs)
      ScheduleModule.forRoot(),

      // Bull Queue with mock/minimal config
      BullModule.forRoot({
        redis: {
          host: 'localhost',
          port: 6379,
        },
      }),

      // Feature Modules
      SessionsModule,
      ParticipantsModule,
      RegistrationsModule,
      CheckInsModule,
      ReportsModule,
      BulkModule,
      HealthModule,

      // Additional modules passed by tests
      ...additionalModules,
    ],
  })
    // Override Bull Queue to avoid Redis connection - use getQueueToken for proper injection
    .overrideProvider(getQueueToken(SESSION_SCHEDULER_QUEUE))
    .useValue(createMockQueue())
    .compile();

  const app = moduleFixture.createNestApplication();

  // Configure API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  // Configure validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  const connection = moduleFixture.get<Connection>(getConnectionToken());

  return {
    app,
    mongoServer,
    connection,
    module: moduleFixture,
  };
}

/**
 * Clean up E2E test resources
 * Call this in afterAll()
 */
export async function closeE2ETestApp(context: E2ETestContext): Promise<void> {
  if (context.connection) {
    await context.connection.close();
  }
  if (context.mongoServer) {
    await context.mongoServer.stop();
  }
  if (context.app) {
    await context.app.close();
  }
}

/**
 * Clear all collections between tests
 * Call this in afterEach()
 */
export async function clearE2ETestData(context: E2ETestContext): Promise<void> {
  if (!context.connection) return;

  const collections = context.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Also clear the mock cache
  TestCacheModule.clearCache();
}
