/**
 * Health Check E2E Tests
 * End-to-end tests for the Health API endpoints
 *
 * Route: /api/v1/health
 *
 * Critical for production monitoring and load balancer health checks
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createE2ETestApp,
  closeE2ETestApp,
  E2ETestContext,
} from '../../utils/e2e-test-setup';

describe('Health (e2e)', () => {
  let context: E2ETestContext;
  let app: INestApplication;

  beforeAll(async () => {
    context = await createE2ETestApp();
    app = context.app;
  }, 60000);

  afterAll(async () => {
    await closeE2ETestApp(context);
  });

  // ============================================================================
  // BASIC HEALTH CHECK TESTS
  // ============================================================================
  describe('GET /api/v1/health', () => {
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

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should include memory information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('memory');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
    });

    it('should include database status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body.database.status).toBe('connected');
    });

    it('should include redis status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('redis');
      expect(response.body.redis.status).toBe('connected');
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
      // Liveness should respond within 200ms (be generous for CI)
      expect(duration).toBeLessThan(200);
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

    it('should return readiness with details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================
  describe('Health Check Performance', () => {
    it('should handle multiple concurrent health checks', async () => {
      const requests = Array.from({ length: 10 }, () =>
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

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer()).get('/api/v1/health').expect(200);
        responseTimes.push(Date.now() - startTime);
      }

      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      // Average should be under 100ms
      expect(avgTime).toBeLessThan(100);
      // No single request should take more than 500ms (generous for CI)
      expect(maxTime).toBeLessThan(500);
    });
  });
});
