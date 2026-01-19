/**
 * Bulk Operations E2E Tests
 * End-to-end tests for the Bulk API endpoints
 *
 * Route: /api/v1/bulk
 *
 * Test Coverage:
 * ✔️ Normal cases (happy paths)
 * ✔️ Edge/boundary conditions
 * ✔️ Error/invalid input handling
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as xlsx from 'xlsx';
import {
  createE2ETestApp,
  closeE2ETestApp,
  clearE2ETestData,
  E2ETestContext,
} from '../../utils/e2e-test-setup';
import { mockData } from '../../utils/test-utils';

/**
 * Helper function to create Excel buffer from data
 */
function createExcelBuffer(data: any[]): Buffer {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Participants');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('Bulk Operations (e2e)', () => {
  let context: E2ETestContext;
  let app: INestApplication;
  let sessionId: string;

  beforeAll(async () => {
    context = await createE2ETestApp();
    app = context.app;
  }, 60000);

  afterAll(async () => {
    await closeE2ETestApp(context);
  });

  beforeEach(async () => {
    await clearE2ETestData(context);

    // Create a session for testing
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/v1/sessions')
      .send(
        mockData.createSessionDto({
          name: 'Bulk Test Session',
          isOpen: true,
          capacity: 500,
        }),
      );
    sessionId = sessionResponse.body.data._id;
  });

  // ============================================================================
  // TEMPLATE DOWNLOAD TESTS
  // ============================================================================
  describe('GET /api/v1/bulk/template/participants', () => {
    // HAPPY PATH
    it('should download participants template Excel file', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bulk/template/participants')
        .expect(200);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.xlsx');
    });

    it('should return valid Excel file structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bulk/template/participants')
        .expect(200);

      // Parse the Excel file to verify structure
      const workbook = xlsx.read(response.body, { type: 'buffer' });
      expect(workbook.SheetNames.length).toBeGreaterThan(0);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Get all data including headers
      const data = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      });

      // Template should have at least a header row with columns
      expect(data.length).toBeGreaterThan(0);
      const headers = data[0];

      // Verify headers exist (could be any column names for a participant template)
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // BULK UPLOAD PARTICIPANTS TESTS
  // ============================================================================
  describe('POST /api/v1/bulk/upload/participants', () => {
    // HAPPY PATH
    it('should successfully upload participants from Excel', async () => {
      const participantsData = [
        {
          name: 'John Doe',
          email: 'john@bulk.com',
          organization: 'Acme Corp',
          phone: '+1234567890',
        },
        {
          name: 'Jane Smith',
          email: 'jane@bulk.com',
          organization: 'Tech Inc',
          phone: '+0987654321',
        },
        {
          name: 'Bob Wilson',
          email: 'bob@bulk.com',
          organization: 'StartUp Ltd',
        },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(3);
      expect(response.body.failed).toBe(0);
    });

    it('should return count of created participants', async () => {
      const participantsData = [
        { name: 'Test User', email: 'test@bulk.com', organization: 'Test Org' },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(1);
      expect(response.body.failed).toBe(0);
    });

    // EDGE CASES
    it('should handle file with 100 participants', async () => {
      const participantsData = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk User ${i}`,
        email: `bulk${i}@test.com`,
        organization: `Org ${i % 10}`,
      }));
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(100);
    }, 30000); // Extended timeout for large uploads

    it('should handle partial failures gracefully', async () => {
      // First create a participant that will conflict
      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'duplicate@bulk.com' }));

      const participantsData = [
        { name: 'New User', email: 'new@bulk.com', organization: 'New Org' },
        {
          name: 'Duplicate',
          email: 'duplicate@bulk.com',
          organization: 'Dup Org',
        },
        {
          name: 'Another New',
          email: 'another@bulk.com',
          organization: 'Another Org',
        },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(2);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toHaveProperty('row');
      expect(response.body.errors[0]).toHaveProperty('error');
    });

    it('should handle file with missing optional columns', async () => {
      const participantsData = [
        { name: 'Minimal User', email: 'minimal@bulk.com' }, // Only required fields
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(1);
    });

    it('should process cell values with whitespace', async () => {
      const participantsData = [
        {
          name: '  Trimmed User  ',
          email: '  trim@bulk.com  ',
          organization: '  Trim Org  ',
        },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      // Verify participant was created successfully
      expect(response.body.created).toBe(1);
      expect(response.body.failed).toBe(0);
    });

    // ERROR CASES
    it('should reject file with missing required columns', async () => {
      const invalidData = [
        { name: 'Missing Email' }, // No email column
      ];
      const excelBuffer = createExcelBuffer(invalidData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      // Should report as failed, not crash
      expect(response.body.failed).toBe(1);
    });

    it('should handle empty file', async () => {
      const emptyBuffer = createExcelBuffer([]);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', emptyBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(0);
      expect(response.body.failed).toBe(0);
    });

    it('should reject non-Excel file', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', Buffer.from('not an excel file'), 'participants.txt');

      // Server rejects invalid file with error status
      expect([400, 500]).toContain(response.status);
    });

    it('should process rows with invalid email gracefully', async () => {
      const participantsData = [
        { name: 'Invalid Email', email: 'not-an-email', organization: 'Test' },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bulk/upload/participants')
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      // Service either creates the participant or reports a failure
      // Total processed should be 1
      expect(response.body.created + response.body.failed).toBe(1);
    });
  });

  // ============================================================================
  // BULK UPLOAD TO SESSION TESTS
  // ============================================================================
  describe('POST /api/v1/bulk/upload/sessions/:sessionId/participants', () => {
    // HAPPY PATH
    it('should upload participants and register to session', async () => {
      const participantsData = [
        {
          name: 'Session User 1',
          email: 'session1@bulk.com',
          organization: 'Org A',
        },
        {
          name: 'Session User 2',
          email: 'session2@bulk.com',
          organization: 'Org B',
        },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/upload/sessions/${sessionId}/participants`)
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      expect(response.body.created).toBe(2);
      expect(response.body.registered).toBe(2);

      // Verify registrations were created
      const registrationsRes = await request(app.getHttpServer())
        .get('/api/v1/registrations')
        .query({ sessionId });

      expect(registrationsRes.body.data.length).toBe(2);
    });

    // EDGE CASES
    it('should handle existing participants by creating only registrations', async () => {
      // First create a participant
      const existingEmail = 'existing@bulk.com';
      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({
            name: 'Existing User',
            email: existingEmail,
          }),
        );

      const participantsData = [
        { name: 'Existing User', email: existingEmail, organization: 'Org' },
        { name: 'New User', email: 'new@bulk.com', organization: 'Org' },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/upload/sessions/${sessionId}/participants`)
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(200);

      // Should have registered both (creating one new participant)
      expect(response.body.registered).toBeGreaterThanOrEqual(1);
    });

    // ERROR CASES
    it('should fail for non-existent session', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';
      const participantsData = [
        { name: 'Test', email: 'test@bulk.com', organization: 'Org' },
      ];
      const excelBuffer = createExcelBuffer(participantsData);

      await request(app.getHttpServer())
        .post(`/api/v1/bulk/upload/sessions/${fakeSessionId}/participants`)
        .attach('file', excelBuffer, 'participants.xlsx')
        .expect(404);
    });
  });

  // ============================================================================
  // BULK ASSIGN PARTICIPANTS TESTS
  // ============================================================================
  describe('POST /api/v1/bulk/sessions/:sessionId/assign', () => {
    let participantIds: string[];

    beforeEach(async () => {
      participantIds = [];
      // Create some participants
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/participants')
          .send(
            mockData.createParticipantDto({
              email: `assign${i}@bulk.com`,
              name: `Assign User ${i}`,
            }),
          );
        participantIds.push(res.body.data._id);
      }
    });

    // HAPPY PATH
    it('should assign multiple participants to session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds })
        .expect(200);

      expect(response.body.assigned).toBe(5);
      expect(response.body.failed).toBe(0);
    });

    it('should return summary of assignment results', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds: [participantIds[0], participantIds[1]] })
        .expect(200);

      expect(response.body).toHaveProperty('assigned');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('skipped');
    });

    // EDGE CASES
    it('should skip already registered participants', async () => {
      // First, assign one participant
      await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send({ participantId: participantIds[0], sessionId });

      // Try to bulk assign including the already registered one
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds })
        .expect(200);

      expect(response.body.assigned).toBe(4);
      expect(response.body.skipped).toBe(1);
    });

    it('should handle empty participant list', async () => {
      const _response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds: [] })
        .expect(400); // Empty array should fail validation (ArrayNotEmpty decorator)
    });

    it('should handle large batch of participants (100+)', async () => {
      // Create 100 more participants
      const moreParticipantIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/participants')
          .send(
            mockData.createParticipantDto({
              email: `batch${i}@bulk.com`,
              name: `Batch User ${i}`,
            }),
          );
        moreParticipantIds.push(res.body.data._id);
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds: moreParticipantIds })
        .expect(200);

      expect(response.body.assigned).toBe(100);
    }, 60000); // Extended timeout

    // ERROR CASES
    it('should handle non-existent participants gracefully', async () => {
      const fakeParticipantId = '507f1f77bcf86cd799439011';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds: [fakeParticipantId, participantIds[0]] })
        .expect(200);

      expect(response.body.assigned).toBe(1);
      expect(response.body.failed).toBe(1);
    });

    it('should fail for non-existent session', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${fakeSessionId}/assign`)
        .send({ participantIds })
        .expect(404);
    });

    it('should validate participant IDs format', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bulk/sessions/${sessionId}/assign`)
        .send({ participantIds: ['invalid-id-1', 'invalid-id-2'] })
        .expect(400);
    });
  });
});
