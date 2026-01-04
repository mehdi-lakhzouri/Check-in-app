/**
 * Sessions E2E Tests
 * End-to-end tests for the Sessions API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Connection } from 'mongoose';
import { SessionsModule } from '../../../src/modules/sessions/sessions.module';
import { mockData } from '../../utils/test-utils';

describe('Sessions (e2e)', () => {
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
          load: [() => ({ app: { checkinLateThresholdMinutes: 10 } })],
        }),
        MongooseModule.forRoot(mongoUri),
        SessionsModule,
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
        forbidNonWhitelisted: true,
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

  afterEach(async () => {
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('POST /api/v1/sessions', () => {
    it('should create a new session', async () => {
      const createDto = mockData.createSessionDto();

      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(createDto)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(createDto.name);
      expect(response.body.data.isOpen).toBe(createDto.isOpen);
    });

    it('should return 400 for invalid session data', async () => {
      const invalidDto = {
        name: '', // Empty name
        startTime: 'invalid-date',
        endTime: 'invalid-date',
      };

      await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 when endTime is before startTime', async () => {
      const invalidDto = mockData.createSessionDto({
        startTime: '2026-01-15T10:00:00Z',
        endTime: '2026-01-15T09:00:00Z',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(invalidDto)
        .expect(400);

      // The message might be in different formats
      expect(response.body.message).toBeDefined();
    });

    it('should create session without optional fields', async () => {
      const minimalDto = {
        name: 'Minimal Session',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(minimalDto)
        .expect(201);

      expect(response.body.data.name).toBe('Minimal Session');
      expect(response.body.data.isOpen).toBe(false);
    });
  });

  describe('GET /api/v1/sessions', () => {
    beforeEach(async () => {
      const sessions = [
        mockData.createSessionDto({ name: 'Session 1' }),
        mockData.createSessionDto({ name: 'Session 2' }),
        mockData.createSessionDto({ name: 'Session 3' }),
      ];

      for (const session of sessions) {
        await request(app.getHttpServer())
          .post('/api/v1/sessions')
          .send(session);
      }
    });

    it('should return all sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(3);
    });

    it('should return paginated results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(3);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
    });

    it('should filter by isOpen status', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ name: 'Open Session', isOpen: true }));

      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions')
        .query({ isOpen: true })
        .expect(200);

      expect(response.body.data.every((s: any) => s.isOpen === true)).toBe(true);
    });
  });

  describe('GET /api/v1/sessions/:id', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ name: 'Test Session' }));
      
      sessionId = response.body.data._id;
    });

    it('should return a session by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(sessionId);
      expect(response.body.data.name).toBe('Test Session');
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/sessions/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sessions/invalid-id')
        .expect(400);
    });
  });

  describe('PATCH /api/v1/sessions/:id', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ name: 'Original Name' }));
      
      sessionId = response.body.data._id;
    });

    it('should update a session', async () => {
      const updateDto = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${sessionId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should partially update a session', async () => {
      const updateDto = { isOpen: true };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${sessionId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.isOpen).toBe(true);
      expect(response.body.data.name).toBe('Original Name');
    });

    it('should return 404 when updating non-existent session', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${fakeId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/sessions/:id', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto());
      
      sessionId = response.body.data._id;
    });

    it('should delete a session', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/sessions/${sessionId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/sessions/${sessionId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent session', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .delete(`/api/v1/sessions/${fakeId}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/sessions/:id/toggle-open', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ isOpen: false }));
      
      sessionId = response.body.data._id;
    });

    it('should toggle session to open', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${sessionId}/toggle-open`)
        .query({ isOpen: true })
        .expect(200);

      expect(response.body.data.isOpen).toBe(true);
    });

    it('should toggle session to closed', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${sessionId}/toggle-open`)
        .query({ isOpen: true });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/sessions/${sessionId}/toggle-open`)
        .query({ isOpen: false })
        .expect(200);

      expect(response.body.data.isOpen).toBe(false);
    });
  });

  describe('GET /api/v1/sessions/upcoming', () => {
    beforeEach(async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7);
      
      for (let i = 0; i < 3; i++) {
        const startTime = new Date(futureDate.getTime() + i * 3600000);
        const endTime = new Date(startTime.getTime() + 3600000);
        
        await request(app.getHttpServer())
          .post('/api/v1/sessions')
          .send(mockData.createSessionDto({
            name: `Future Session ${i + 1}`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          }));
      }
    });

    it('should return upcoming sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions/upcoming')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions/upcoming')
        .query({ limit: 2 })
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/v1/sessions/stats', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ name: 'Open Session', isOpen: true }));
      
      await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ name: 'Closed Session', isOpen: false }));
    });

    it('should return session statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions/stats')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('open');
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });
  });
});
