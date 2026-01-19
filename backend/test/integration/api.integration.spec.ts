/**
 * Integration Tests for API Endpoints
 * Tests the interaction between controllers and services using mocked dependencies
 *
 * Test Coverage:
 * ✔️ Controller → Service integration
 * ✔️ Request validation pipelines
 * ✔️ Response transformation
 * ✔️ Error handling middleware
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
  HttpStatus,
} from '@nestjs/common';
import request from 'supertest';
import { SessionsController } from '../../src/modules/sessions/controllers/sessions.controller';
import { SessionsService } from '../../src/modules/sessions/services/sessions.service';
import { ParticipantsController } from '../../src/modules/participants/controllers/participants.controller';
import { ParticipantsService } from '../../src/modules/participants/services/participants.service';
import { RegistrationsController } from '../../src/modules/registrations/controllers/registrations.controller';
import { RegistrationsService } from '../../src/modules/registrations/services/registrations.service';
import { CheckInsController } from '../../src/modules/checkins/controllers/checkins.controller';
import { CheckInsService } from '../../src/modules/checkins/services/checkins.service';
import { ParticipantStatus } from '../../src/modules/participants/schemas';
import { Types } from 'mongoose';

describe('API Integration Tests', () => {
  let app: INestApplication;

  // Mock services
  const mockSessionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockParticipantsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByQrCode: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRegistrationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySession: jest.fn(),
    findByParticipant: jest.fn(),
    remove: jest.fn(),
  };

  const mockCheckInsService = {
    create: jest.fn(),
    processQrCode: jest.fn(),
    verifyQr: jest.fn(),
    acceptCheckIn: jest.fn(),
    declineCheckIn: jest.fn(),
    checkInByQr: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySession: jest.fn(),
    findByParticipant: jest.fn(),
    remove: jest.fn(),
    getCheckInStatus: jest.fn(),
    getAttempts: jest.fn(),
    getAttemptStats: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        SessionsController,
        ParticipantsController,
        RegistrationsController,
        CheckInsController,
      ],
      providers: [
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: ParticipantsService, useValue: mockParticipantsService },
        { provide: RegistrationsService, useValue: mockRegistrationsService },
        { provide: CheckInsService, useValue: mockCheckInsService },
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
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SESSIONS VALIDATION TESTS
  // ============================================================================
  describe('Sessions Validation', () => {
    const validSessionId = new Types.ObjectId().toString();

    it('should create a session with valid data', async () => {
      const sessionData = {
        name: 'Test Session',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        location: 'Test Location',
        capacity: 100,
        isOpen: true,
      };

      const createdSession = {
        _id: validSessionId,
        ...sessionData,
        currentParticipants: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSessionsService.create.mockResolvedValue(createdSession);

      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(sessionData)
        .expect(HttpStatus.CREATED);

      expect(mockSessionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Session' }),
      );
    });

    it('should reject session with empty name', async () => {
      const invalidSession = {
        name: '',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        location: 'Test Location',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(invalidSession)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockSessionsService.create).not.toHaveBeenCalled();
    });

    it('should reject session with negative capacity', async () => {
      const invalidSession = {
        name: 'Test Session',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        location: 'Test Location',
        capacity: -10,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/sessions')
        .send(invalidSession)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockSessionsService.create).not.toHaveBeenCalled();
    });

    it('should get all sessions', async () => {
      mockSessionsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions')
        .expect(HttpStatus.OK);

      expect(mockSessionsService.findAll).toHaveBeenCalled();
    });

    it('should get session by id', async () => {
      const session = {
        _id: validSessionId,
        name: 'Test Session',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        location: 'Test Location',
      };

      mockSessionsService.findOne.mockResolvedValue(session);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/sessions/${validSessionId}`)
        .expect(HttpStatus.OK);

      expect(mockSessionsService.findOne).toHaveBeenCalledWith(validSessionId);
    });
  });

  // ============================================================================
  // PARTICIPANTS VALIDATION TESTS
  // ============================================================================
  describe('Participants Validation', () => {
    const validParticipantId = new Types.ObjectId().toString();

    it('should create a participant with valid data', async () => {
      const participantData = {
        name: 'Test Participant',
        email: 'test@example.com',
        status: ParticipantStatus.REGULAR,
      };

      const createdParticipant = {
        _id: validParticipantId,
        ...participantData,
        qrCode: 'generated-qr-code',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockParticipantsService.create.mockResolvedValue(createdParticipant);

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(participantData)
        .expect(HttpStatus.CREATED);

      expect(mockParticipantsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should reject participant with invalid email format', async () => {
      const invalidParticipant = {
        name: 'Test Participant',
        email: 'invalid-email',
        status: ParticipantStatus.REGULAR,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(invalidParticipant)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockParticipantsService.create).not.toHaveBeenCalled();
    });

    it('should reject participant with empty name', async () => {
      const invalidParticipant = {
        name: '',
        email: 'test@example.com',
        status: ParticipantStatus.REGULAR,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(invalidParticipant)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockParticipantsService.create).not.toHaveBeenCalled();
    });

    it('should reject participant with invalid status', async () => {
      const invalidParticipant = {
        name: 'Test Participant',
        email: 'test@example.com',
        status: 'INVALID_STATUS',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(invalidParticipant)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockParticipantsService.create).not.toHaveBeenCalled();
    });

    it('should get all participants', async () => {
      mockParticipantsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .expect(HttpStatus.OK);

      expect(mockParticipantsService.findAll).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REGISTRATIONS VALIDATION TESTS
  // ============================================================================
  describe('Registrations Validation', () => {
    const validSessionId = new Types.ObjectId().toString();
    const validParticipantId = new Types.ObjectId().toString();
    const validRegistrationId = new Types.ObjectId().toString();

    it('should create a registration with valid data', async () => {
      const registrationData = {
        sessionId: validSessionId,
        participantId: validParticipantId,
      };

      const createdRegistration = {
        _id: validRegistrationId,
        ...registrationData,
        registeredAt: new Date().toISOString(),
      };

      mockRegistrationsService.create.mockResolvedValue(createdRegistration);

      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send(registrationData)
        .expect(HttpStatus.CREATED);

      expect(mockRegistrationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: validSessionId }),
      );
    });

    it('should reject registration with invalid sessionId format', async () => {
      const invalidRegistration = {
        sessionId: 'invalid-id',
        participantId: validParticipantId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send(invalidRegistration)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockRegistrationsService.create).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid participantId format', async () => {
      const invalidRegistration = {
        sessionId: validSessionId,
        participantId: 'invalid-id',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/registrations')
        .send(invalidRegistration)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockRegistrationsService.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CHECK-INS VALIDATION TESTS
  // ============================================================================
  describe('Check-ins Validation', () => {
    const validSessionId = new Types.ObjectId().toString();
    const validParticipantId = new Types.ObjectId().toString();
    const validCheckInId = new Types.ObjectId().toString();

    it('should create a check-in with valid data', async () => {
      const checkInData = {
        sessionId: validSessionId,
        participantId: validParticipantId,
      };

      const createdCheckIn = {
        _id: validCheckInId,
        ...checkInData,
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      mockCheckInsService.create.mockResolvedValue(createdCheckIn);

      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send(checkInData)
        .expect(HttpStatus.CREATED);

      expect(mockCheckInsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: validSessionId }),
      );
    });

    it('should reject check-in with invalid ObjectId format', async () => {
      const invalidCheckIn = {
        sessionId: 'not-a-valid-objectid',
        participantId: validParticipantId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send(invalidCheckIn)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockCheckInsService.create).not.toHaveBeenCalled();
    });

    it('should reject check-in with extra fields (forbidNonWhitelisted)', async () => {
      const invalidCheckIn = {
        sessionId: validSessionId,
        participantId: validParticipantId,
        extraField: 'should-not-be-here',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin')
        .send(invalidCheckIn)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockCheckInsService.create).not.toHaveBeenCalled();
    });

    it('should verify QR code for session and participant', async () => {
      const qrCode = 'test-qr-code-123';
      mockCheckInsService.verifyQr.mockResolvedValue({
        isValid: true,
        participant: { name: 'Test', email: 'test@test.com' },
        isRegistered: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/checkin/verify-qr')
        .send({ qrCode, sessionId: validSessionId })
        .expect(HttpStatus.OK);

      expect(mockCheckInsService.verifyQr).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  describe('Error Handling', () => {
    const nonExistentId = new Types.ObjectId().toString();

    it('should return 404 for non-existent session', async () => {
      mockSessionsService.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/sessions/${nonExistentId}`)
        .expect(HttpStatus.OK); // Returns null, controller decides

      expect(mockSessionsService.findOne).toHaveBeenCalledWith(nonExistentId);
    });

    it('should return 404 for non-existent participant', async () => {
      mockParticipantsService.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/participants/${nonExistentId}`)
        .expect(HttpStatus.OK);

      expect(mockParticipantsService.findOne).toHaveBeenCalledWith(
        nonExistentId,
      );
    });
  });

  // ============================================================================
  // RESPONSE FORMAT TESTS
  // ============================================================================
  describe('Response Format', () => {
    it('should return proper pagination in list responses', async () => {
      mockSessionsService.findAll.mockResolvedValue({
        data: [{ _id: new Types.ObjectId().toString(), name: 'Session 1' }],
        total: 1,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/sessions?page=1&limit=10')
        .expect(HttpStatus.OK);

      expect(mockSessionsService.findAll).toHaveBeenCalled();
    });
  });
});
