/**
 * Registrations Service Unit Tests
 * Tests for the RegistrationsService class
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RegistrationsService } from '../../../src/modules/registrations/services/registrations.service';
import { RegistrationRepository } from '../../../src/modules/registrations/repositories/registration.repository';
import {
  EntityNotFoundException,
  EntityExistsException,
} from '../../../src/common/exceptions';
import { createMockRegistrationRepository } from '../../utils/mock-factories';
import { mockData, generateObjectId } from '../../utils/test-utils';
import { RegistrationStatus } from '../../../src/modules/registrations/schemas';

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let repository: ReturnType<typeof createMockRegistrationRepository>;

  beforeEach(async () => {
    repository = createMockRegistrationRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        {
          provide: RegistrationRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a registration successfully', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createRegistrationDto(
        participantId,
        sessionId,
      );
      const expectedRegistration = mockData.registration(
        participantId,
        sessionId,
      );

      repository.findByParticipantAndSession.mockResolvedValue(null);
      repository.create.mockResolvedValue(expectedRegistration as any);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedRegistration);
      expect(repository.findByParticipantAndSession).toHaveBeenCalledWith(
        participantId,
        sessionId,
      );
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw EntityExistsException when registration already exists', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createRegistrationDto(
        participantId,
        sessionId,
      );
      const existingRegistration = mockData.registration(
        participantId,
        sessionId,
      );

      repository.findByParticipantAndSession.mockResolvedValue(
        existingRegistration as any,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        EntityExistsException,
      );
    });

    it('should convert string IDs to ObjectIds', async () => {
      const participantId = generateObjectId();
      const sessionId = generateObjectId();
      const createDto = mockData.createRegistrationDto(
        participantId,
        sessionId,
      );
      const expectedRegistration = mockData.registration(
        participantId,
        sessionId,
      );

      repository.findByParticipantAndSession.mockResolvedValue(null);
      repository.create.mockResolvedValue(expectedRegistration as any);

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          participantId: expect.any(Types.ObjectId),
          sessionId: expect.any(Types.ObjectId),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated registrations', async () => {
      const registrations = [mockData.registration(), mockData.registration()];
      const paginatedResult = {
        data: registrations,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResult);
      expect(repository.findWithFilters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should filter by status', async () => {
      const paginatedResult = {
        data: [
          mockData.registration(undefined, undefined, {
            status: RegistrationStatus.CONFIRMED,
          }),
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const _result = await service.findAll({
        status: RegistrationStatus.CONFIRMED,
      });

      expect(repository.findWithFilters).toHaveBeenCalledWith({
        status: RegistrationStatus.CONFIRMED,
      });
    });

    it('should filter by sessionId', async () => {
      const sessionId = generateObjectId();
      const paginatedResult = {
        data: [mockData.registration(undefined, sessionId)],
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
    it('should return a registration when found', async () => {
      const registrationId = generateObjectId();
      const expectedRegistration = mockData.registration();

      repository.findWithPopulate.mockResolvedValue(
        expectedRegistration as any,
      );

      const result = await service.findOne(registrationId);

      expect(result).toEqual(expectedRegistration);
      expect(repository.findWithPopulate).toHaveBeenCalledWith(registrationId);
    });

    it('should throw EntityNotFoundException when registration not found', async () => {
      const registrationId = generateObjectId();
      repository.findWithPopulate.mockResolvedValue(null);

      await expect(service.findOne(registrationId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('findByParticipant', () => {
    it('should return registrations for a participant', async () => {
      const participantId = generateObjectId();
      const registrations = [
        mockData.registration(participantId),
        mockData.registration(participantId),
      ];

      repository.findByParticipant.mockResolvedValue(registrations as any);

      const result = await service.findByParticipant(participantId);

      expect(result).toHaveLength(2);
      expect(repository.findByParticipant).toHaveBeenCalledWith(participantId);
    });
  });

  describe('findBySession', () => {
    it('should return registrations for a session', async () => {
      const sessionId = generateObjectId();
      const registrations = [
        mockData.registration(undefined, sessionId),
        mockData.registration(undefined, sessionId),
      ];

      repository.findBySession.mockResolvedValue(registrations as any);

      const result = await service.findBySession(sessionId);

      expect(result).toHaveLength(2);
      expect(repository.findBySession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('update', () => {
    it('should update a registration successfully', async () => {
      const registrationId = generateObjectId();
      const updateDto = { status: RegistrationStatus.CANCELLED };
      const updatedRegistration = mockData.registration(
        undefined,
        undefined,
        updateDto,
      );

      repository.updateById.mockResolvedValue(updatedRegistration as any);

      const result = await service.update(registrationId, updateDto);

      expect(result.status).toBe(RegistrationStatus.CANCELLED);
      expect(repository.updateById).toHaveBeenCalledWith(
        registrationId,
        updateDto,
      );
    });

    it('should throw EntityNotFoundException when updating non-existent registration', async () => {
      const registrationId = generateObjectId();
      repository.updateById.mockResolvedValue(null);

      await expect(
        service.update(registrationId, {
          status: RegistrationStatus.CANCELLED,
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a registration successfully', async () => {
      const registrationId = generateObjectId();
      const deletedRegistration = mockData.registration();

      repository.deleteById.mockResolvedValue(deletedRegistration as any);

      const result = await service.remove(registrationId);

      expect(result).toEqual(deletedRegistration);
      expect(repository.deleteById).toHaveBeenCalledWith(registrationId);
    });

    it('should throw EntityNotFoundException when deleting non-existent registration', async () => {
      const registrationId = generateObjectId();
      repository.deleteById.mockResolvedValue(null);

      await expect(service.remove(registrationId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('removeBySession', () => {
    it('should delete all registrations for a session', async () => {
      const sessionId = generateObjectId();
      repository.deleteBySession.mockResolvedValue(5);

      const result = await service.removeBySession(sessionId);

      expect(result).toBe(5);
      expect(repository.deleteBySession).toHaveBeenCalledWith(sessionId);
    });

    it('should return 0 when no registrations found for session', async () => {
      const sessionId = generateObjectId();
      repository.deleteBySession.mockResolvedValue(0);

      const result = await service.removeBySession(sessionId);

      expect(result).toBe(0);
    });
  });

  describe('removeByParticipant', () => {
    it('should delete all registrations for a participant', async () => {
      const participantId = generateObjectId();
      repository.deleteByParticipant.mockResolvedValue(3);

      const result = await service.removeByParticipant(participantId);

      expect(result).toBe(3);
      expect(repository.deleteByParticipant).toHaveBeenCalledWith(
        participantId,
      );
    });
  });

  describe('countBySession', () => {
    it('should return count of registrations for a session', async () => {
      const sessionId = generateObjectId();
      repository.countBySession.mockResolvedValue(10);

      const result = await service.countBySession(sessionId);

      expect(result).toBe(10);
      expect(repository.countBySession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('getStats', () => {
    it('should return registration statistics', async () => {
      const stats = {
        total: 100,
        confirmed: 80,
        pending: 15,
        cancelled: 5,
        todayRegistrations: 10,
      };

      repository.getRegistrationStats.mockResolvedValue(stats);

      const result = await service.getStats();

      expect(result).toEqual(stats);
      expect(repository.getRegistrationStats).toHaveBeenCalled();
    });
  });
});
