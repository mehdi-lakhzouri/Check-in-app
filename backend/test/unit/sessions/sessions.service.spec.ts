/**
 * Sessions Service Unit Tests
 * Tests for the SessionsService class
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from '../../../src/modules/sessions/services/sessions.service';
import { SessionSchedulerService } from '../../../src/modules/sessions/services/session-scheduler.service';
import { SessionRepository } from '../../../src/modules/sessions/repositories/session.repository';
import { REDIS_CLIENT } from '../../../src/common/redis';
import {
  EntityNotFoundException,
  ValidationException,
} from '../../../src/common/exceptions';
import {
  createMockSessionRepository,
  createMockConfigService,
} from '../../utils/mock-factories';
import { mockData, generateObjectId } from '../../utils/test-utils';

describe('SessionsService', () => {
  let service: SessionsService;
  let repository: ReturnType<typeof createMockSessionRepository>;
  let configService: ReturnType<typeof createMockConfigService>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
  };

  const mockSchedulerService = {
    registerStatusUpdateCallback: jest.fn(),
    unregisterStatusUpdateCallback: jest.fn(),
    manualStatusUpdate: jest.fn(),
  };

  beforeEach(async () => {
    repository = createMockSessionRepository();
    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: SessionRepository,
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
          provide: SessionSchedulerService,
          useValue: mockSchedulerService,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a session successfully', async () => {
      const createDto = mockData.createSessionDto();
      const expectedSession = mockData.session({ name: createDto.name });

      repository.create.mockResolvedValue(expectedSession);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedSession);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
        }),
      );
    });

    it('should throw ValidationException when endTime is before startTime', async () => {
      const createDto = mockData.createSessionDto({
        startTime: '2026-01-15T10:00:00Z',
        endTime: '2026-01-15T09:00:00Z', // Before start time
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when endTime equals startTime', async () => {
      const sameTime = '2026-01-15T10:00:00Z';
      const createDto = mockData.createSessionDto({
        startTime: sameTime,
        endTime: sameTime,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions', async () => {
      const sessions = [
        mockData.session(),
        mockData.session({ name: 'Session 2' }),
      ];
      const paginatedResult = {
        data: sessions,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(paginatedResult);
      expect(repository.findWithFilters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should return empty array when no sessions exist', async () => {
      const paginatedResult = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      repository.findWithFilters.mockResolvedValue(paginatedResult);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a session when found', async () => {
      const sessionId = generateObjectId();
      const expectedSession = mockData.session({ _id: sessionId });

      repository.findById.mockResolvedValue(expectedSession);

      const result = await service.findOne(sessionId);

      expect(result).toEqual(expectedSession);
      expect(repository.findById).toHaveBeenCalledWith(sessionId);
    });

    it('should throw EntityNotFoundException when session not found', async () => {
      const sessionId = generateObjectId();
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(sessionId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a session successfully', async () => {
      const sessionId = generateObjectId();
      const updateDto = { name: 'Updated Session Name' };
      const existingSession = mockData.session({ _id: sessionId });
      const updatedSession = mockData.session({ _id: sessionId, ...updateDto });

      repository.findById.mockResolvedValue(existingSession);
      repository.updateById.mockResolvedValue(updatedSession);

      const result = await service.update(sessionId, updateDto);

      expect(result.name).toBe('Updated Session Name');
      expect(repository.updateById).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({ name: 'Updated Session Name' }),
      );
    });

    it('should throw EntityNotFoundException when updating non-existent session', async () => {
      const sessionId = generateObjectId();
      repository.findById.mockResolvedValue(null);
      repository.updateById.mockResolvedValue(null);

      await expect(
        service.update(sessionId, { name: 'New Name' }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ValidationException when updating with invalid date range', async () => {
      const sessionId = generateObjectId();
      const existingSession = mockData.session({ _id: sessionId });
      const updateDto = {
        startTime: '2026-01-15T10:00:00Z',
        endTime: '2026-01-15T09:00:00Z',
      };

      repository.findById.mockResolvedValue(existingSession);

      await expect(service.update(sessionId, updateDto)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a session successfully', async () => {
      const sessionId = generateObjectId();
      const deletedSession = mockData.session({ _id: sessionId });

      repository.deleteById.mockResolvedValue(deletedSession);

      const result = await service.remove(sessionId);

      expect(result).toEqual(deletedSession);
      expect(repository.deleteById).toHaveBeenCalledWith(sessionId);
    });

    it('should throw EntityNotFoundException when deleting non-existent session', async () => {
      const sessionId = generateObjectId();
      repository.deleteById.mockResolvedValue(null);

      await expect(service.remove(sessionId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('toggleOpen', () => {
    it('should toggle session open status to true', async () => {
      const sessionId = generateObjectId();
      const updatedSession = mockData.session({ _id: sessionId, isOpen: true });

      repository.updateById.mockResolvedValue(updatedSession);

      const result = await service.toggleOpen(sessionId, true);

      expect(result.isOpen).toBe(true);
      expect(repository.updateById).toHaveBeenCalledWith(sessionId, {
        isOpen: true,
      });
    });

    it('should toggle session open status to false', async () => {
      const sessionId = generateObjectId();
      const updatedSession = mockData.session({
        _id: sessionId,
        isOpen: false,
      });

      repository.updateById.mockResolvedValue(updatedSession);

      const result = await service.toggleOpen(sessionId, false);

      expect(result.isOpen).toBe(false);
    });

    it('should throw EntityNotFoundException when toggling non-existent session', async () => {
      const sessionId = generateObjectId();
      repository.updateById.mockResolvedValue(null);

      await expect(service.toggleOpen(sessionId, true)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('getUpcoming', () => {
    it('should return upcoming sessions with default limit', async () => {
      const upcomingSessions = [mockData.session(), mockData.session()];
      repository.findUpcoming.mockResolvedValue(upcomingSessions);

      const result = await service.getUpcoming();

      expect(result).toHaveLength(2);
      expect(repository.findUpcoming).toHaveBeenCalledWith(5);
    });

    it('should return upcoming sessions with custom limit', async () => {
      const upcomingSessions = [mockData.session()];
      repository.findUpcoming.mockResolvedValue(upcomingSessions);

      const result = await service.getUpcoming(1);

      expect(result).toHaveLength(1);
      expect(repository.findUpcoming).toHaveBeenCalledWith(1);
    });
  });

  describe('getStats', () => {
    it('should return session statistics', async () => {
      const stats = {
        total: 10,
        open: 3,
        upcoming: 5,
        past: 5,
      };

      repository.getSessionStats.mockResolvedValue(stats);

      const result = await service.getStats();

      expect(result).toEqual(stats);
      expect(repository.getSessionStats).toHaveBeenCalled();
    });
  });

  describe('incrementCheckInCount', () => {
    it('should increment check-in count for a session', async () => {
      const sessionId = generateObjectId();
      repository.incrementCheckInCount.mockResolvedValue(undefined);

      await service.incrementCheckInCount(sessionId);

      expect(repository.incrementCheckInCount).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('decrementCheckInCount', () => {
    it('should decrement check-in count for a session', async () => {
      const sessionId = generateObjectId();
      repository.decrementCheckInCount.mockResolvedValue(undefined);

      await service.decrementCheckInCount(sessionId);

      expect(repository.decrementCheckInCount).toHaveBeenCalledWith(sessionId);
    });
  });
});
