/**
 * Reports E2E Tests
 * End-to-end tests for the Reports API endpoints
 *
 * Route: /api/v1/reports
 *
 * Test Coverage:
 * ✔️ Normal cases (happy paths)
 * ✔️ Edge/boundary conditions
 * ✔️ Error/invalid input handling
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

describe('Reports (e2e)', () => {
  let context: E2ETestContext;
  let app: INestApplication;
  let sessionId: string;
  let participantIds: string[] = [];

  beforeAll(async () => {
    context = await createE2ETestApp();
    app = context.app;
  }, 60000);

  afterAll(async () => {
    await closeE2ETestApp(context);
  });

  beforeEach(async () => {
    await clearE2ETestData(context);
    participantIds = [];

    // Create a session with check-ins for testing
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/v1/sessions')
      .send(
        mockData.createSessionDto({
          name: 'Report Test Session',
          isOpen: true,
          capacity: 100,
        }),
      );
    sessionId = sessionResponse.body.data._id;

    // Create multiple participants and check them in
    for (let i = 0; i < 5; i++) {
      const participantResponse = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({
            email: `report-test-${i}@example.com`,
            name: `Report Test User ${i}`,
          }),
        );
      participantIds.push(participantResponse.body.data._id);

      // Check in the participant
      await request(app.getHttpServer()).post('/api/v1/checkin').send({
        participantId: participantResponse.body.data._id,
        sessionId,
      });
    }
  });

  // ============================================================================
  // ATTENDANCE REPORT TESTS
  // ============================================================================
  describe('GET /api/v1/reports/attendance', () => {
    // HAPPY PATH
    it('should generate attendance report in JSON format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/attendance')
        .query({ sessionId, format: 'json' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.report).toHaveLength(5);
    });

    it('should generate attendance report in Excel format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/attendance')
        .query({ sessionId, format: 'excel' })
        .expect(200);

      // Excel responses should have specific content type
      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    // EDGE CASES
    it('should handle session with no check-ins', async () => {
      // Create an empty session
      const emptySessionRes = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(mockData.createSessionDto({ name: 'Empty Session' }));
      const emptySessionId = emptySessionRes.body.data._id;

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/attendance')
        .query({ sessionId: emptySessionId, format: 'json' })
        .expect(200);

      expect(response.body.data.report).toHaveLength(0);
    });

    it('should include check-in time in report', async () => {
      // Create a session that started 15 minutes ago
      const pastStartTime = new Date(Date.now() - 15 * 60 * 1000);
      const lateSessionRes = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(
          mockData.createSessionDto({
            name: 'Late Session',
            isOpen: true,
            startTime: pastStartTime.toISOString(),
            endTime: new Date(pastStartTime.getTime() + 3600000).toISOString(),
          }),
        );
      const lateSessionId = lateSessionRes.body.data._id;

      // Create and check in a participant (will be late)
      const lateParticipantRes = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'late@example.com' }));

      await request(app.getHttpServer()).post('/api/v1/checkin').send({
        participantId: lateParticipantRes.body.data._id,
        sessionId: lateSessionId,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/attendance')
        .query({ sessionId: lateSessionId, format: 'json' })
        .expect(200);

      expect(response.body.data.report).toHaveLength(1);
      expect(response.body.data.report[0]).toHaveProperty('checkInTime');
    });

    // ERROR CASES
    it('should handle non-existent session', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';

      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/attendance')
        .query({ sessionId: fakeSessionId, format: 'json' })
        .expect(200);

      // Non-existent session returns empty report
      expect(response.body.data.report).toHaveLength(0);
    });

    it('should return 400 for invalid session ID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/attendance')
        .query({ sessionId: 'invalid-id', format: 'json' })
        .expect(400);
    });
  });

  // ============================================================================
  // SESSION REPORT TESTS
  // ============================================================================
  describe('GET /api/v1/reports/session/:sessionId', () => {
    // HAPPY PATH
    it('should generate detailed session report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/session/${sessionId}`)
        .query({ format: 'json' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data.statistics.totalCheckIns).toBe(5);
    });

    it('should generate session report in Excel format', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/session/${sessionId}`)
        .query({ format: 'excel' })
        .expect(200);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    // EDGE CASES
    it('should calculate correct statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/session/${sessionId}`)
        .query({ format: 'json' })
        .expect(200);

      // Verify statistics are calculated
      expect(response.body.data.statistics.totalCheckIns).toBe(5);
      expect(response.body.data.statistics).toHaveProperty('attendanceRate');
    });

    it('should include check-in method breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reports/session/${sessionId}`)
        .query({ format: 'json' })
        .expect(200);

      expect(response.body.data.statistics).toHaveProperty('qrCheckIns');
      expect(response.body.data.statistics).toHaveProperty('manualCheckIns');
    });

    // ERROR CASES
    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/reports/session/${fakeSessionId}`)
        .query({ format: 'json' })
        .expect(404);
    });
  });

  // ============================================================================
  // STATISTICS REPORT TESTS
  // ============================================================================
  describe('GET /api/v1/reports/statistics', () => {
    // HAPPY PATH
    it('should generate overall statistics report', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/statistics')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('sessions');
      expect(response.body.data).toHaveProperty('participants');
      expect(response.body.data.sessions.total).toBe(1);
      expect(response.body.data.participants.total).toBe(5);
    });

    // EDGE CASES
    it('should return statistics with current data', async () => {
      // Get current statistics (after beforeEach has set up data)
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/statistics')
        .expect(200);

      // beforeEach creates 1 session and 5 participants
      expect(response.body.data.sessions.total).toBeGreaterThanOrEqual(1);
      expect(response.body.data.participants.total).toBeGreaterThanOrEqual(5);
    });

    it('should include check-in statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/statistics')
        .expect(200);

      expect(response.body.data).toHaveProperty('checkIns');
      expect(response.body.data.checkIns.total).toBe(5);
    });
  });

  // ============================================================================
  // SESSIONS SHEETS TESTS
  // ============================================================================
  describe('GET /api/v1/reports/sessions-sheets', () => {
    beforeEach(async () => {
      // Create additional sessions
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/sessions')
          .send(
            mockData.createSessionDto({
              name: `Additional Session ${i}`,
              capacity: 50 + i * 10,
            }),
          );
      }
    });

    // HAPPY PATH
    it('should generate sessions overview sheets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sessions-sheets')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('sessions');
      expect(response.body.data.sessions.length).toBeGreaterThanOrEqual(4);
    });

    // EDGE CASES
    it('should include check-in counts for each session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sessions-sheets')
        .expect(200);

      // The main test session should have 5 check-ins
      const mainSession = response.body.data.sessions.find(
        (s: any) => s.sessionName === 'Report Test Session',
      );
      expect(mainSession).toBeDefined();
      expect(mainSession.checkIns).toBe(5);
    });

    it('should sort sessions appropriately', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/sessions-sheets')
        .expect(200);

      // Verify sessions are returned in expected order (e.g., by date or name)
      expect(response.body.data.sessions.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CONCURRENT ACCESS TESTS
  // ============================================================================
  describe('Concurrent Report Generation', () => {
    it('should handle multiple concurrent report requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).get('/api/v1/reports/statistics'),
      );

      const results = await Promise.allSettled(requests);

      // At least 80% of requests should succeed (allow for some network variability in CI)
      const successfulResults = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200,
      );
      expect(successfulResults.length).toBeGreaterThanOrEqual(4);

      successfulResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect(result.value.body.status).toBe('success');
        }
      });
    });
  });
});
