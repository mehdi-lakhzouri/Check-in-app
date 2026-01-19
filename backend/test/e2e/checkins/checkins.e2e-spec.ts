/**
 * Check-ins E2E Tests
 * End-to-end tests for the Check-ins API endpoints
 *
 * Route: /api/v1/checkin (singular)
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
import { CheckInMethod } from '../../../src/modules/checkins/schemas';

describe('CheckIns (e2e)', () => {
  let context: E2ETestContext;
  let app: INestApplication;
  let sessionId: string;
  let participantId: string;
  let participantQrCode: string;

  beforeAll(async () => {
    context = await createE2ETestApp();
    app = context.app;
  }, 60000);

  afterAll(async () => {
    await closeE2ETestApp(context);
  });

  beforeEach(async () => {
    await clearE2ETestData(context);

    // Create a session that is open
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/v1/sessions')
      .send(
        mockData.createSessionDto({
          name: 'Test Session',
          isOpen: true,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      );
    sessionId = sessionResponse.body.data._id;

    // Create a participant
    const participantResponse = await request(app.getHttpServer())
      .post('/api/v1/participants')
      .send(mockData.createParticipantDto());
    participantId = participantResponse.body.data._id;
    participantQrCode = participantResponse.body.data.qrCode;
  });

  describe('POST /api/v1/checkin', () => {
    it('should create a manual check-in', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId,
          sessionId,
          method: CheckInMethod.MANUAL,
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.participantId).toBe(participantId);
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.method).toBe(CheckInMethod.MANUAL);
    });

    it('should return 400 for invalid participant ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId: 'invalid-id',
          sessionId,
        })
        .expect(400);
    });

    it('should return 400 for invalid session ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId,
          sessionId: 'invalid-id',
        })
        .expect(400);
    });

    it('should return 400 when session is not open', async () => {
      // Create a closed session
      const closedSessionResponse = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(
          mockData.createSessionDto({ name: 'Closed Session', isOpen: false }),
        );
      const closedSessionId = closedSessionResponse.body.data._id;

      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId,
          sessionId: closedSessionId,
        })
        .expect(400);
    });

    it('should return 409 when participant already checked in', async () => {
      // First check-in
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId })
        .expect(201);

      // Duplicate check-in
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId })
        .expect(409);
    });

    it('should return 404 when participant does not exist', async () => {
      const fakeParticipantId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId: fakeParticipantId,
          sessionId,
        })
        .expect(404);
    });

    it('should return 404 when session does not exist', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId,
          sessionId: fakeSessionId,
        })
        .expect(404);
    });

    it('should mark check-in as late when after threshold', async () => {
      // Create a session that started 15 minutes ago
      const pastStartTime = new Date(Date.now() - 15 * 60 * 1000);
      const lateSessionResponse = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(
          mockData.createSessionDto({
            name: 'Late Session',
            isOpen: true,
            startTime: pastStartTime.toISOString(),
            endTime: new Date(pastStartTime.getTime() + 3600000).toISOString(),
          }),
        );
      const lateSessionId = lateSessionResponse.body.data._id;

      // Create a new participant for this test
      const lateParticipantResponse = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({
            email: 'late-participant@example.com',
          }),
        );
      const lateParticipantId = lateParticipantResponse.body.data._id;

      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({
          participantId: lateParticipantId,
          sessionId: lateSessionId,
        })
        .expect(201);

      expect(response.body.data.isLate).toBe(true);
    });
  });

  describe('POST /api/v1/checkin/qr', () => {
    it('should create a check-in via QR code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin/qr')
        .send({
          qrCode: participantQrCode,
          sessionId,
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.method).toBe(CheckInMethod.QR);
    });

    it('should return 404 for non-existent QR code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/checkin/qr')
        .send({
          qrCode: 'QR-NONEXISTENT',
          sessionId,
        })
        .expect(404);
    });

    it('should return 400 when session is not open', async () => {
      // Create a closed session
      const closedSessionResponse = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(
          mockData.createSessionDto({ name: 'Closed Session', isOpen: false }),
        );
      const closedSessionId = closedSessionResponse.body.data._id;

      await request(app.getHttpServer())
        .post('/api/v1/checkin/qr')
        .send({
          qrCode: participantQrCode,
          sessionId: closedSessionId,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/checkin', () => {
    beforeEach(async () => {
      // Create some check-ins
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId });

      // Create another participant and check-in
      const participant2Response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'second@example.com' }));

      await request(app.getHttpServer()).post('/api/v1/checkin').send({
        participantId: participant2Response.body.data._id,
        sessionId,
      });
    });

    it('should return all check-ins', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by sessionId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin')
        .query({ sessionId })
        .expect(200);

      expect(
        response.body.data.every(
          (c: any) =>
            c.sessionId === sessionId || c.sessionId?._id === sessionId,
        ),
      ).toBe(true);
    });

    it('should filter by participantId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin')
        .query({ participantId })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return paginated results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/checkin/:id', () => {
    let checkInId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId });

      checkInId = response.body.data._id;
    });

    it('should return a check-in by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/checkin/${checkInId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(checkInId);
    });

    it('should return 404 for non-existent check-in', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/checkin/${fakeId}`)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/checkin/:id', () => {
    let checkInId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId });

      checkInId = response.body.data._id;
    });

    it('should delete a check-in', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/checkin/${checkInId}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/checkin/${checkInId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent check-in', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .delete(`/api/v1/checkin/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/checkin/stats', () => {
    beforeEach(async () => {
      // Create some check-ins
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId });

      const participant2Response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'stats@example.com' }));

      await request(app.getHttpServer()).post('/api/v1/checkin').send({
        participantId: participant2Response.body.data._id,
        sessionId,
      });
    });

    it('should return check-in statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin/stats')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should return stats for specific session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin/stats')
        .query({ sessionId })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/checkin/recent', () => {
    beforeEach(async () => {
      // Create some check-ins
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId });

      const participant2Response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'recent@example.com' }));

      await request(app.getHttpServer()).post('/api/v1/checkin').send({
        participantId: participant2Response.body.data._id,
        sessionId,
      });
    });

    it('should return recent check-ins', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin/recent')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should limit results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin/recent')
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by sessionId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/checkin/recent')
        .query({ sessionId })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/checkin/verify/:participantId/:sessionId', () => {
    it('should verify participant is not checked in', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/checkin/verify/${participantId}/${sessionId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isCheckedIn).toBe(false);
    });

    it('should verify participant is checked in', async () => {
      // Check in the participant
      await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send({ participantId, sessionId });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/checkin/verify/${participantId}/${sessionId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isCheckedIn).toBe(true);
    });

    it('should return 400 for invalid IDs', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/checkin/verify/invalid-id/invalid-session')
        .expect(400);
    });
  });
});
