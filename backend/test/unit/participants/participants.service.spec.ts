/**
 * Participants Service Unit Tests
 * Tests for the ParticipantsService class
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { ParticipantsService } from '../../../src/modules/participants/services/participants.service';
import { ParticipantRepository } from '../../../src/modules/participants/repositories/participant.repository';
import { CheckInsService } from '../../../src/modules/checkins/services/checkins.service';
import { RegistrationsService } from '../../../src/modules/registrations/services/registrations.service';
import {
  EntityNotFoundException,
  EntityExistsException,
} from '../../../src/common/exceptions';
import { createMockParticipantRepository, createMockConfigService, createMockCheckInsService, createMockRegistrationsService } from '../../utils/mock-factories';
import { mockData, generateObjectId } from '../../utils/test-utils';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let repository: ReturnType<typeof createMockParticipantRepository>;
  let configService: ReturnType<typeof createMockConfigService>;
  let checkInsService: ReturnType<typeof createMockCheckInsService>;
  let registrationsService: ReturnType<typeof createMockRegistrationsService>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    repository = createMockParticipantRepository();
    configService = createMockConfigService();
    checkInsService = createMockCheckInsService();
    registrationsService = createMockRegistrationsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        {
          provide: ParticipantRepository,
          useValue: repository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: CheckInsService,
          useValue: checkInsService,
        },
        {
          provide: RegistrationsService,
          useValue: registrationsService,
        },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a participant successfully', async () => {
      const createDto = mockData.createParticipantDto();
      const expectedParticipant = mockData.participant({
        name: createDto.name,
        email: createDto.email,
      });

      repository.findByEmail.mockResolvedValue(null);
      repository.findByQrCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(expectedParticipant);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedParticipant);
      expect(repository.findByEmail).toHaveBeenCalledWith(createDto.email);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw EntityExistsException when email already exists', async () => {
      const createDto = mockData.createParticipantDto();
      const existingParticipant = mockData.participant({
        email: createDto.email,
      });

      repository.findByEmail.mockResolvedValue(existingParticipant);

      await expect(service.create(createDto)).rejects.toThrow(
        EntityExistsException,
      );
    });

    it('should throw EntityExistsException when provided qrCode already exists', async () => {
      const qrCode = 'QR-EXISTING123';
      const createDto = mockData.createParticipantDto();
      (createDto as any).qrCode = qrCode;

      const existingParticipant = mockData.participant({ qrCode });

      repository.findByEmail.mockResolvedValue(null);
      repository.findByQrCode.mockResolvedValue(existingParticipant);

      await expect(service.create(createDto)).rejects.toThrow(
        EntityExistsException,
      );
    });

    it('should generate unique QR code when not provided', async () => {
      const createDto = mockData.createParticipantDto();
      const expectedParticipant = mockData.participant({
        name: createDto.name,
        email: createDto.email,
      });

      repository.findByEmail.mockResolvedValue(null);
      repository.findByQrCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(expectedParticipant);

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          qrCode: expect.stringMatching(/^QR-[A-Z0-9-]+$/),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated participants', async () => {
      const participants = [
        mockData.participant(),
        mockData.participant({ name: 'Jane Doe' }),
      ];
      const paginatedResult = {
        data: participants,
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

    it('should filter by search term', async () => {
      const paginatedResult = {
        data: [mockData.participant({ name: 'John' })],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const result = await service.findAll({ search: 'John' });

      expect(result.data).toHaveLength(1);
      expect(repository.findWithFilters).toHaveBeenCalledWith({
        search: 'John',
      });
    });
  });

  describe('findOne', () => {
    it('should return a participant when found', async () => {
      const participantId = generateObjectId();
      const expectedParticipant = mockData.participant({ _id: participantId });

      repository.findById.mockResolvedValue(expectedParticipant);

      const result = await service.findOne(participantId);

      expect(result).toEqual(expectedParticipant);
      expect(repository.findById).toHaveBeenCalledWith(participantId);
    });

    it('should throw EntityNotFoundException when participant not found', async () => {
      const participantId = generateObjectId();
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(participantId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('findByQrCode', () => {
    it('should return a participant when QR code is found', async () => {
      const qrCode = 'QR-TEST123';
      const expectedParticipant = mockData.participant({ qrCode });

      repository.findByQrCode.mockResolvedValue(expectedParticipant);

      const result = await service.findByQrCode(qrCode);

      expect(result).toEqual(expectedParticipant);
      expect(repository.findByQrCode).toHaveBeenCalledWith(qrCode);
    });

    it('should throw EntityNotFoundException when QR code not found', async () => {
      const qrCode = 'QR-NONEXISTENT';
      repository.findByQrCode.mockResolvedValue(null);

      await expect(service.findByQrCode(qrCode)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a participant when email is found', async () => {
      const email = 'test@example.com';
      const expectedParticipant = mockData.participant({ email });

      repository.findByEmail.mockResolvedValue(expectedParticipant);

      const result = await service.findByEmail(email);

      expect(result).toEqual(expectedParticipant);
    });

    it('should return null when email not found', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a participant successfully', async () => {
      const participantId = generateObjectId();
      const updateDto = { name: 'Updated Name' };
      const existingParticipant = mockData.participant({ _id: participantId });
      const updatedParticipant = mockData.participant({
        _id: participantId,
        ...updateDto,
      });

      repository.findById.mockResolvedValue(existingParticipant);
      repository.findByEmail.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(updatedParticipant);

      const result = await service.update(participantId, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(repository.updateById).toHaveBeenCalledWith(
        participantId,
        updateDto,
      );
    });

    it('should throw EntityNotFoundException when updating non-existent participant', async () => {
      const participantId = generateObjectId();
      repository.findById.mockResolvedValue(null);
      repository.findByEmail.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(null);

      await expect(
        service.update(participantId, { name: 'New Name' }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityExistsException when updating email to existing email', async () => {
      const participantId = generateObjectId();
      const existingParticipantId = generateObjectId();
      const updateDto = { email: 'existing@example.com' };

      const currentParticipant = mockData.participant({ _id: participantId });
      const existingParticipant = mockData.participant({
        _id: existingParticipantId,
        email: updateDto.email,
      });

      repository.findById.mockResolvedValue(currentParticipant);
      repository.findByEmail.mockResolvedValue(existingParticipant);

      await expect(service.update(participantId, updateDto)).rejects.toThrow(
        EntityExistsException,
      );
    });

    it('should allow updating to same email if same participant', async () => {
      const participantId = generateObjectId();
      const updateDto = { email: 'same@example.com', name: 'Updated' };

      const sameParticipant = mockData.participant({
        _id: participantId,
        email: updateDto.email,
      });

      repository.findById.mockResolvedValue(sameParticipant);
      repository.findByEmail.mockResolvedValue(sameParticipant);
      repository.updateById.mockResolvedValue({
        ...sameParticipant,
        name: 'Updated',
      });

      const result = await service.update(participantId, updateDto);

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete a participant successfully', async () => {
      const participantId = generateObjectId();
      const deletedParticipant = mockData.participant({ _id: participantId });

      repository.deleteById.mockResolvedValue(deletedParticipant);

      const result = await service.remove(participantId);

      expect(result).toEqual(deletedParticipant);
      expect(repository.deleteById).toHaveBeenCalledWith(participantId);
    });

    it('should throw EntityNotFoundException when deleting non-existent participant', async () => {
      const participantId = generateObjectId();
      repository.deleteById.mockResolvedValue(null);

      await expect(service.remove(participantId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('generateQrCode', () => {
    it('should generate a unique QR code with data URL', async () => {
      repository.findByQrCode.mockResolvedValue(null);

      const result = await service.generateQrCode();

      expect(result.qrCode).toMatch(/^QR-[A-Z0-9-]+$/);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
