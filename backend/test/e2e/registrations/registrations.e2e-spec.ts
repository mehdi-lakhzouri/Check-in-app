/**
 * Registrations E2E Tests
 * End-to-end tests for the Registrations API endpoints
 *
 * Route: /api/v1/registrations
 * Uses PATCH for updates, stats at /stats/overview
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createE2ETestApp,
  closeE2ETestApp,
  clearE2ETestData,
  E2ETestContext,
} from '../../utils/e2e-test-setup';
import { mockData } from '../../utils/test-utils';
import { RegistrationStatus } from '../../../src/modules/registrations/schemas';

describe('Registrations (e2e)', () => {
  let context: E2ETestContext;
  let app: INestApplication;
  let sessionId: string;
  let participantId: string;

  beforeAll(async () => {
    context = await createE2ETestApp();
    app = context.app;
  }, 60000);

  afterAll(async () => {
    await closeE2ETestApp(context);
  });

  beforeEach(async () => {
    await clearE2ETestData(context);

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
