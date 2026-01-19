/**
 * Health Check E2E Tests
 * End-to-end tests for the Health API endpoints
 *
 * Route: /api/v1/health
 *
 * Critical for production monitoring and load balancer health checks
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Connection } from 'mongoose';
import { HealthModule } from '../../../src/modules/health/health.module';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRoot(mongoUri),
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'api/v',
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
    await app.close();
  });

  // ============================================================================
  // BASIC HEALTH CHECK TESTS
  // ============================================================================
  describe('GET /api/v1/health', () => {
    // HAPPY PATH
    it('should return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should return health details with uptime', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('uptime');
    });

    it('should include memory information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      if (response.body.info?.memory) {
        expect(response.body.info.memory).toHaveProperty('heapUsed');
        expect(response.body.info.memory).toHaveProperty('heapTotal');
      }
    });
  });

  // ============================================================================
  // DATABASE HEALTH CHECK TESTS
  // ============================================================================
  describe('GET /api/v1/health/database', () => {
    it('should return database connection status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/database')
        .expect(200);

      expect(response.body.database).toBeDefined();
      expect(response.body.database.status).toBe('up');
    });

    it('should include database ping time', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/database')
        .expect(200);

      expect(response.body.database.pingTime).toBeDefined();
      expect(typeof response.body.database.pingTime).toBe('number');
    });
  });

  // ============================================================================
  // LIVENESS PROBE TESTS (for Kubernetes)
  // ============================================================================
  describe('GET /api/v1/health/live', () => {
    it('should return liveness status quickly', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.status).toBe('ok');
      // Liveness should respond within 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================================
  // READINESS PROBE TESTS (for Kubernetes)
  // ============================================================================
  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should check all dependencies before reporting ready', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      // Should have checked database
      expect(response.body.info).toBeDefined();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================
  describe('Health Check Performance', () => {
    it('should handle multiple concurrent health checks', async () => {
      const requests = Array.from({ length: 50 }, () =>
        request(app.getHttpServer()).get('/api/v1/health'),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });

    it('should respond consistently under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer()).get('/api/v1/health').expect(200);
        responseTimes.push(Date.now() - startTime);
      }

      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      // Average should be under 50ms
      expect(avgTime).toBeLessThan(50);
      // No single request should take more than 200ms
      expect(maxTime).toBeLessThan(200);
    });
  });
});
