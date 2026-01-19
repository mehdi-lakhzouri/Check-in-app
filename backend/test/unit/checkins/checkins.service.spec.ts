/**
 * CheckIns Service Unit Tests
 * Tests for the CheckInsService class
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CheckInsService } from '../../../src/modules/checkins/services';
import {
  CheckInRepository,
  CheckInAttemptRepository,
} from '../../../src/modules/checkins/repositories';
import { ParticipantsService } from '../../../src/modules/participants/services/participants.service';
import { SessionsService } from '../../../src/modules/sessions/services/sessions.service';
import { RegistrationsService } from '../../../src/modules/registrations/services/registrations.service';
import {
  EntityNotFoundException,
  EntityExistsException,
  ValidationException,
} from '../../../src/common/exceptions';
import {
  createMockCheckInRepository,
  createMockCheckInAttemptRepository,
  createMockConfigService,
  createMockRegistrationsService,
  createMockSessionsService,
  createMockParticipantsService,
} from '../../utils/mock-factories';
import { mockData, generateObjectId } from '../../utils/test-utils';

describe('CheckInsService', () => {
  let service: CheckInsService;
  let repository: ReturnType<typeof createMockCheckInRepository>;
  let attemptRepository: ReturnType<typeof createMockCheckInAttemptRepository>;
  let participantsService: ReturnType<typeof createMockParticipantsService>;
  let sessionsService: ReturnType<typeof createMockSessionsService>;
  let registrationsService: ReturnType<typeof createMockRegistrationsService>;
  let configService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    repository = createMockCheckInRepository();
    attemptRepository = createMockCheckInAttemptRepository();
    configService = createMockConfigService();
    registrationsService = createMockRegistrationsService();
    participantsService = createMockParticipantsService();
    sessionsService = createMockSessionsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInsService,
        {
          provide: CheckInRepository,
          useValue: repository,
        },
        {
          provide: CheckInAttemptRepository,
          useValue: attemptRepository,
        },
        {
          provide: ParticipantsService,
          useValue: participantsService,
        },
        {
          provide: SessionsService,
          useValue: sessionsService,
        },
        {
          provide: RegistrationsService,
          useValue: registrationsService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<CheckInsService>(CheckInsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a check-in successfully', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createCheckInDto(participantId, sessionId);

      const session = mockData.session({ _id: sessionId, isOpen: true });
      const participant = mockData.participant({ _id: participantId });
      const expectedCheckIn = mockData.checkIn(participantId, sessionId);

      sessionsService.findOne.mockResolvedValue(session as any);
      participantsService.findOne.mockResolvedValue(participant as any);
      repository.findByParticipantAndSession.mockResolvedValue(null);
      repository.create.mockResolvedValue(expectedCheckIn as any);
      sessionsService.reserveCapacitySlot.mockResolvedValue({
        success: true,
        capacity: 100,
        checkInsCount: 1,
        remaining: 99,
        percentFull: 1,
        isNearCapacity: false,
      });
      sessionsService.incrementCheckInCount.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.checkIn).toBeDefined();
    });

    it('should throw ValidationException when session is not open', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createCheckInDto(participantId, sessionId);

      const closedSession = mockData.session({ _id: sessionId, isOpen: false });

      sessionsService.findOne.mockResolvedValue(closedSession as any);

      await expect(service.create(createDto)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw EntityExistsException when participant already checked in', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createCheckInDto(participantId, sessionId);

      const session = mockData.session({ _id: sessionId, isOpen: true });
      const participant = mockData.participant({ _id: participantId });

      sessionsService.findOne.mockResolvedValue(session as any);
      participantsService.findOne.mockResolvedValue(participant as any);
      sessionsService.reserveCapacitySlot.mockResolvedValue({
        success: true,
        currentCount: 1,
        capacity: 100,
      });
      registrationsService.isParticipantRegistered.mockResolvedValue({
        isRegistered: true,
      });
      repository.findByParticipantAndSession.mockResolvedValue(null);

      // Mock MongoDB duplicate key error (E11000)
      const duplicateKeyError = new Error('E11000 duplicate key error');
      (duplicateKeyError as any).code = 11000;
      repository.create.mockRejectedValue(duplicateKeyError);
      sessionsService.releaseCapacitySlot.mockResolvedValue(undefined);

      await expect(service.create(createDto)).rejects.toThrow(
        EntityExistsException,
      );
    });

    it('should mark check-in as late when after threshold', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createCheckInDto(participantId, sessionId);

      // Session started 15 minutes ago (threshold is 10 minutes)
      const pastStartTime = new Date(Date.now() - 15 * 60 * 1000);
      const session = mockData.session({
        _id: sessionId,
        isOpen: true,
        startTime: pastStartTime,
      });
      const participant = mockData.participant({ _id: participantId });
      const lateCheckIn = mockData.checkIn(participantId, sessionId, {
        isLate: true,
      });

      sessionsService.findOne.mockResolvedValue(session as any);
      participantsService.findOne.mockResolvedValue(participant as any);
      repository.findByParticipantAndSession.mockResolvedValue(null);
      repository.create.mockResolvedValue(lateCheckIn as any);
      sessionsService.incrementCheckInCount.mockResolvedValue(undefined);
      sessionsService.reserveCapacitySlot.mockResolvedValue({
        success: true,
        currentCount: 1,
        capacity: 100,
      });

      const _result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isLate: true,
        }),
      );
    });

    it('should mark check-in as on-time when within threshold', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createCheckInDto(participantId, sessionId);

      // Session started 5 minutes ago (threshold is 10 minutes)
      const recentStartTime = new Date(Date.now() - 5 * 60 * 1000);
      const session = mockData.session({
        _id: sessionId,
        isOpen: true,
        startTime: recentStartTime,
      });
      const participant = mockData.participant({ _id: participantId });
      const onTimeCheckIn = mockData.checkIn(participantId, sessionId, {
        isLate: false,
      });

      sessionsService.findOne.mockResolvedValue(session as any);
      participantsService.findOne.mockResolvedValue(participant as any);
      repository.findByParticipantAndSession.mockResolvedValue(null);
      repository.create.mockResolvedValue(onTimeCheckIn as any);
      sessionsService.incrementCheckInCount.mockResolvedValue(undefined);
      sessionsService.reserveCapacitySlot.mockResolvedValue({
        success: true,
        currentCount: 1,
        capacity: 100,
      });

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isLate: false,
        }),
      );
    });
  });

  describe('checkInByQr', () => {
    it('should create check-in via QR code successfully', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const qrCode = 'QR-TEST123';

      const session = mockData.session({ _id: sessionId, isOpen: true });
      const participant = mockData.participant({ _id: participantId, qrCode });
      const expectedCheckIn = mockData.checkIn(participantId, sessionId, {
        method: 'qr',
      });

      participantsService.findByQrCode.mockResolvedValue(participant as any);
      sessionsService.findOne.mockResolvedValue(session as any);
      participantsService.findOne.mockResolvedValue(participant as any);
      repository.findByParticipantAndSession.mockResolvedValue(null);
      repository.create.mockResolvedValue(expectedCheckIn as any);
      sessionsService.incrementCheckInCount.mockResolvedValue(undefined);
      sessionsService.reserveCapacitySlot.mockResolvedValue({
        success: true,
        currentCount: 1,
        capacity: 100,
      });

      const result = await service.checkInByQr({ qrCode, sessionId });

      expect(result.checkIn.method).toBe('qr');
      expect(participantsService.findByQrCode).toHaveBeenCalledWith(qrCode);
    });

    it('should throw EntityNotFoundException when QR code not found', async () => {
      const sessionId = generateObjectId();
      const qrCode = 'QR-NONEXISTENT';

      participantsService.findByQrCode.mockRejectedValue(
        new EntityNotFoundException('Participant', `qrCode: ${qrCode}`),
      );

      await expect(service.checkInByQr({ qrCode, sessionId })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated check-ins', async () => {
      const checkIns = [mockData.checkIn(), mockData.checkIn()];
      const paginatedResult = {
        data: checkIns,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResult);
    });

    it('should filter by sessionId', async () => {
      const sessionId = generateObjectId();
      const paginatedResult = {
        data: [mockData.checkIn(undefined, sessionId)],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const _result = await service.findAll({ sessionId });

      expect(repository.findWithFilters).toHaveBeenCalledWith({ sessionId });
    });
  });

  describe('findOne', () => {
    it('should return a check-in when found', async () => {
      const checkInId = generateObjectId();
      const expectedCheckIn = mockData.checkIn();

      repository.findWithPopulate.mockResolvedValue(expectedCheckIn as any);

      const result = await service.findOne(checkInId);

      expect(result).toEqual(expectedCheckIn);
    });

    it('should throw EntityNotFoundException when check-in not found', async () => {
      const checkInId = generateObjectId();
      repository.findWithPopulate.mockResolvedValue(null);

      await expect(service.findOne(checkInId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('findByParticipant', () => {
    it('should return check-ins for a participant', async () => {
      const participantId = generateObjectId();
      const checkIns = [
        mockData.checkIn(participantId),
        mockData.checkIn(participantId),
      ];

      repository.findByParticipant.mockResolvedValue(checkIns as any);

      const result = await service.findByParticipant(participantId);

      expect(result).toHaveLength(2);
      expect(repository.findByParticipant).toHaveBeenCalledWith(participantId);
    });
  });

  describe('findBySession', () => {
    it('should return check-ins for a session', async () => {
      const sessionId = generateObjectId();
      const checkIns = [
        mockData.checkIn(undefined, sessionId),
        mockData.checkIn(undefined, sessionId),
      ];

      repository.findBySession.mockResolvedValue(checkIns as any);

      const result = await service.findBySession(sessionId);

      expect(result).toHaveLength(2);
      expect(repository.findBySession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('remove', () => {
    it('should delete a check-in successfully', async () => {
      const checkInId = generateObjectId();
      const sessionId = generateObjectId();
      const checkIn = mockData.checkIn(undefined, sessionId, {
        _id: checkInId,
      });

      repository.findById.mockResolvedValue(checkIn as any);
      repository.deleteById.mockResolvedValue(checkIn as any);
      sessionsService.decrementCheckInCount.mockResolvedValue(undefined);

      const result = await service.remove(checkInId);

      expect(result).toEqual(checkIn);
      expect(sessionsService.decrementCheckInCount).toHaveBeenCalledWith(
        sessionId,
      );
    });

    it('should throw EntityNotFoundException when deleting non-existent check-in', async () => {
      const checkInId = generateObjectId();
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(checkInId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });
});
