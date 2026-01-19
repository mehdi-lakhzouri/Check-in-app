/**
 * Registrations E2E Tests
 * End-to-end tests for the Registrations API endpoints
 *
 * Route: /api/v1/registrations
 * Uses PATCH for updates, stats at /stats/overview
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
import { RegistrationsModule } from '../../../src/modules/registrations/registrations.module';
import { SessionsModule } from '../../../src/modules/sessions/sessions.module';
import { ParticipantsModule } from '../../../src/modules/participants/participants.module';
import { mockData } from '../../utils/test-utils';
import { RegistrationStatus } from '../../../src/modules/registrations/schemas';

describe('Registrations (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let sessionId: string;
  let participantId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRoot(mongoUri),
        SessionsModule,
        ParticipantsModule,
        RegistrationsModule,
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

  beforeEach(async () => {
    // Clean up collections
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create a session
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/v1/sessions')
      .send(mockData.createSessionDto({ name: 'Test Session' }));
    sessionId = sessionResponse.body.data._id;

    // Create a participant
    const participantResponse = await request(app.getHttpServer())
      .post('/api/v1/participants')
      .send(mockData.createParticipantDto());
    participantId = participantResponse.body.data._id;
  });

  describe('POST /api/v1/registrations', () => {
    it('should create a new registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({
          participantId,
          sessionId,
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.participantId).toBe(participantId);
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.status).toBe(RegistrationStatus.PENDING);
    });

    it('should create registration with confirmed status', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({
          participantId,
          sessionId,
          status: RegistrationStatus.CONFIRMED,
        })
        .expect(201);

      expect(response.body.data.status).toBe(RegistrationStatus.CONFIRMED);
    });

    it('should return 400 for invalid participant ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({
          participantId: 'invalid-id',
          sessionId,
        })
        .expect(400);
    });

    it('should return 400 for invalid session ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({
          participantId,
          sessionId: 'invalid-id',
        })
        .expect(400);
    });

    it('should return 409 for duplicate registration', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId, sessionId })
        .expect(201);

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId, sessionId })
        .expect(409);
    });

    it('should return 400 for invalid status value', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({
          participantId,
          sessionId,
          status: 'invalid-status',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/registrations', () => {
    beforeEach(async () => {
      // Create multiple registrations
      for (let i = 0; i < 3; i++) {
        const pResponse = await request(app.getHttpServer())
          .post('/api/v1/participants')
          .send(
            mockData.createParticipantDto({
              email: `reg-test${i}@example.com`,
            }),
          );

        await request(app.getHttpServer()).post('/api/v1/registrations').send({
          participantId: pResponse.body.data._id,
          sessionId,
        });
      }
    });

    it('should return all registrations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by sessionId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations')
        .query({ sessionId })
        .expect(200);

      expect(
        response.body.data.every(
          (r: any) =>
            r.sessionId === sessionId || r.sessionId?._id === sessionId,
        ),
      ).toBe(true);
    });

    it('should filter by participantId', async () => {
      // Create a registration for our test participant
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId, sessionId });

      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations')
        .query({ participantId })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      // Create a confirmed registration
      const pResponse = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({ email: 'confirmed@example.com' }),
        );

      await request(app.getHttpServer()).post('/api/v1/registrations').send({
        participantId: pResponse.body.data._id,
        sessionId,
        status: RegistrationStatus.CONFIRMED,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations')
        .query({ status: RegistrationStatus.CONFIRMED })
        .expect(200);

      expect(
        response.body.data.every(
          (r: any) => r.status === RegistrationStatus.CONFIRMED,
        ),
      ).toBe(true);
    });

    it('should return paginated results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /api/v1/registrations/:id', () => {
    let registrationId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId, sessionId });

      registrationId = response.body.data._id;
    });

    it('should return a registration by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/registrations/${registrationId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(registrationId);
    });

    it('should return 404 for non-existent registration', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/registrations/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/registrations/invalid-id')
        .expect(400);
    });
  });

  describe('PATCH /api/v1/registrations/:id', () => {
    let registrationId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId, sessionId });

      registrationId = response.body.data._id;
    });

    it('should update a registration status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/registrations/${registrationId}`)
        .send({ status: RegistrationStatus.CONFIRMED })
        .expect(200);

      expect(response.body.data.status).toBe(RegistrationStatus.CONFIRMED);
    });

    it('should update registration to cancelled', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/registrations/${registrationId}`)
        .send({ status: RegistrationStatus.CANCELLED })
        .expect(200);

      expect(response.body.data.status).toBe(RegistrationStatus.CANCELLED);
    });

    it('should return 404 when updating non-existent registration', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .patch(`/api/v1/registrations/${fakeId}`)
        .send({ status: RegistrationStatus.CONFIRMED })
        .expect(404);
    });

    it('should return 400 for invalid status', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/registrations/${registrationId}`)
        .send({ status: 'invalid-status' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/registrations/:id', () => {
    let registrationId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId, sessionId });

      registrationId = response.body.data._id;
    });

    it('should delete a registration', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/registrations/${registrationId}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/registrations/${registrationId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent registration', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .delete(`/api/v1/registrations/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/registrations/stats/overview', () => {
    beforeEach(async () => {
      // Create registrations with different statuses
      for (let i = 0; i < 2; i++) {
        const pResponse = await request(app.getHttpServer())
          .post('/api/v1/participants')
          .send(
            mockData.createParticipantDto({ email: `stats${i}@example.com` }),
          );

        await request(app.getHttpServer()).post('/api/v1/registrations').send({
          participantId: pResponse.body.data._id,
          sessionId,
          status: RegistrationStatus.CONFIRMED,
        });
      }

      const pResponse = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'pending@example.com' }));

      await request(app.getHttpServer()).post('/api/v1/registrations').send({
        participantId: pResponse.body.data._id,
        sessionId,
        status: RegistrationStatus.PENDING,
      });
    });

    it('should return registration statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations/stats/overview')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('should have confirmed and pending counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/registrations/stats/overview')
        .expect(200);

      expect(response.body.data).toHaveProperty('confirmed');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data.confirmed).toBeGreaterThanOrEqual(2);
      expect(response.body.data.pending).toBeGreaterThanOrEqual(1);
    });
  });
});
