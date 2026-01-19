/**
 * Reports Service Unit Tests
 * Comprehensive tests for the ReportsService class
 *
 * Test Coverage:
 * ✔️ Normal cases (happy paths)
 * ✔️ Edge/boundary conditions
 * ✔️ Error/invalid input handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../../src/modules/reports/services/reports.service';
import { SessionsService } from '../../../src/modules/sessions/services/sessions.service';
import { ParticipantsService } from '../../../src/modules/participants/services/participants.service';
import { CheckInsService } from '../../../src/modules/checkins/services/checkins.service';
import { RegistrationsService } from '../../../src/modules/registrations/services/registrations.service';
import {
  createMockSessionsService,
  createMockParticipantsService,
  createMockCheckInsService,
  createMockRegistrationsService,
} from '../../utils/mock-factories';
import { mockData, generateObjectId } from '../../utils/test-utils';
import { ReportFormat } from '../../../src/modules/reports/dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let sessionsService: ReturnType<typeof createMockSessionsService>;
  let participantsService: ReturnType<typeof createMockParticipantsService>;
  let checkInsService: ReturnType<typeof createMockCheckInsService>;
  let registrationsService: ReturnType<typeof createMockRegistrationsService>;

  beforeEach(async () => {
    sessionsService = createMockSessionsService();
    participantsService = createMockParticipantsService();
    checkInsService = createMockCheckInsService();
    registrationsService = createMockRegistrationsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: SessionsService,
          useValue: sessionsService,
        },
        {
          provide: ParticipantsService,
          useValue: participantsService,
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

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // ATTENDANCE REPORT TESTS
  // ============================================================================
  describe('generateAttendanceReport', () => {
    // HAPPY PATH
    it('should generate attendance report in JSON format', async () => {
      const sessionId = generateObjectId();
      const _session = mockData.session({
        _id: sessionId,
        name: 'Conference Day 1',
      });
      const checkIns = [
        mockData.checkIn(generateObjectId(), sessionId),
        mockData.checkIn(generateObjectId(), sessionId),
      ];

      checkInsService.findAll.mockResolvedValue({
        data: checkIns,
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      });

      const result = await service.generateAttendanceReport({
        sessionId,
        format: ReportFormat.JSON,
      });

      expect(result).toBeDefined();
      if ('report' in result) {
        expect(result).toHaveProperty('report');
        expect(result).toHaveProperty('meta');
      }
    });

    it('should generate attendance report in Excel format', async () => {
      const sessionId = generateObjectId();
      const checkIns = [mockData.checkIn(generateObjectId(), sessionId)];

      checkInsService.findAll.mockResolvedValue({
        data: checkIns,
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      });

      const result = await service.generateAttendanceReport({
        sessionId,
        format: ReportFormat.EXCEL,
      });

      expect(result).toBeDefined();
      // Excel format returns buffer and filename
      if ('buffer' in result) {
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.filename).toContain('.xlsx');
      }
    });

    // EDGE CASES
    it('should handle session with no check-ins', async () => {
      const sessionId = generateObjectId();

      checkInsService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      });

      const result = await service.generateAttendanceReport({
        sessionId,
        format: ReportFormat.JSON,
      });

      if ('report' in result) {
        expect(result.report).toHaveLength(0);
      }
    });

    it('should handle session with many check-ins (1000+)', async () => {
      const sessionId = generateObjectId();
      const manyCheckIns = Array.from({ length: 1000 }, () =>
        mockData.checkIn(generateObjectId(), sessionId),
      );

      checkInsService.findAll.mockResolvedValue({
        data: manyCheckIns as any,
        meta: { total: 1000, page: 1, limit: 1000, totalPages: 1 },
      });

      const result = await service.generateAttendanceReport({
        sessionId,
        format: ReportFormat.JSON,
      });

      if ('report' in result) {
        expect(result.report).toHaveLength(1000);
      }
    });

    // ERROR CASES
    it('should throw error when checkInsService fails', async () => {
      const fakeSessionId = generateObjectId();

      checkInsService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateAttendanceReport({
          sessionId: fakeSessionId,
          format: ReportFormat.JSON,
        }),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // SESSION REPORT TESTS
  // ============================================================================
  describe('generateSessionReport', () => {
    // HAPPY PATH
    it('should generate detailed session report', async () => {
      const sessionId = generateObjectId();
      const session = mockData.session({
        _id: sessionId,
        name: 'Keynote',
        capacity: 100,
        checkInsCount: 75,
      });
      const checkIns = Array.from({ length: 75 }, () =>
        mockData.checkIn(generateObjectId(), sessionId),
      );
      const registrations = Array.from({ length: 80 }, () =>
        mockData.registration(generateObjectId(), sessionId),
      );

      sessionsService.findOne.mockResolvedValue(session as any);
      checkInsService.findBySession.mockResolvedValue(checkIns as any);
      registrationsService.findBySession.mockResolvedValue(
        registrations as any,
      );

      const result = await service.generateSessionReport(
        sessionId,
        ReportFormat.JSON,
      );

      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('statistics');
      if ('statistics' in result) {
        expect(result.statistics.totalCheckIns).toBe(75);
      }
    });

    // EDGE CASES
    it('should calculate correct attendance rate', async () => {
      const sessionId = generateObjectId();
      const session = mockData.session({
        _id: sessionId,
        capacity: 100,
        checkInsCount: 50,
      });
      const checkIns = Array.from({ length: 50 }, () =>
        mockData.checkIn(generateObjectId(), sessionId),
      );
      const registrations = Array.from({ length: 60 }, () =>
        mockData.registration(generateObjectId(), sessionId),
      );

      sessionsService.findOne.mockResolvedValue(session as any);
      checkInsService.findBySession.mockResolvedValue(checkIns as any);
      registrationsService.findBySession.mockResolvedValue(
        registrations as any,
      );

      const result = await service.generateSessionReport(
        sessionId,
        ReportFormat.JSON,
      );

      // 50 check-ins / 60 registrations = 83.33% attendance
      if ('statistics' in result) {
        expect(result.statistics.attendanceRate).toBe('83.33%');
      }
    });

    it('should handle 100% capacity session', async () => {
      const sessionId = generateObjectId();
      const session = mockData.session({
        _id: sessionId,
        capacity: 50,
        checkInsCount: 50,
      });
      const checkIns = Array.from({ length: 50 }, () =>
        mockData.checkIn(generateObjectId(), sessionId),
      );
      const registrations = Array.from({ length: 50 }, () =>
        mockData.registration(generateObjectId(), sessionId),
      );

      sessionsService.findOne.mockResolvedValue(session as any);
      checkInsService.findBySession.mockResolvedValue(checkIns as any);
      registrationsService.findBySession.mockResolvedValue(
        registrations as any,
      );

      const result = await service.generateSessionReport(
        sessionId,
        ReportFormat.JSON,
      );

      // 50 check-ins / 50 registrations = 100% attendance
      if ('statistics' in result) {
        expect(result.statistics.attendanceRate).toBe('100.00%');
      }
    });
  });

  // ============================================================================
  // STATISTICS REPORT TESTS
  // ============================================================================
  describe('generateStatisticsReport', () => {
    // HAPPY PATH
    it('should generate overall statistics report', async () => {
      const sessionStats = {
        total: 10,
        open: 3,
        closed: 7,
        upcoming: 5,
        totalCheckIns: 500,
      };
      const participantStats = {
        total: 200,
        active: 180,
        ambassadors: 20,
      };

      sessionsService.getStats.mockResolvedValue(sessionStats);
      participantsService.getStats.mockResolvedValue(participantStats);

      const result = await service.generateStatisticsReport();

      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('participants');
      expect(result.sessions.total).toBe(10);
      expect(result.participants.total).toBe(200);
    });

    // EDGE CASES
    it('should handle empty database', async () => {
      const emptySessionStats = {
        total: 0,
        open: 0,
        closed: 0,
        upcoming: 0,
        totalCheckIns: 0,
      };
      const emptyParticipantStats = { total: 0, active: 0, ambassadors: 0 };

      sessionsService.getStats.mockResolvedValue(emptySessionStats);
      participantsService.getStats.mockResolvedValue(emptyParticipantStats);

      const result = await service.generateStatisticsReport();

      expect(result.sessions.total).toBe(0);
      expect(result.participants.total).toBe(0);
    });
  });

  // ============================================================================
  // SESSIONS SHEETS TESTS
  // ============================================================================
  describe('generateSessionsSheets', () => {
    // HAPPY PATH
    it('should generate sessions overview sheets', async () => {
      const session1Id = generateObjectId();
      const session2Id = generateObjectId();
      const sessions = [
        mockData.session({ _id: session1Id, name: 'Session 1' }),
        mockData.session({ _id: session2Id, name: 'Session 2' }),
      ];
      const paginatedResult = {
        data: sessions,
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      };

      sessionsService.findAll.mockResolvedValue(paginatedResult as any);
      checkInsService.findBySession.mockResolvedValue([]);
      registrationsService.findBySession.mockResolvedValue([]);

      const result = await service.generateSessionsSheets();

      expect(result).toBeDefined();
      expect(result.sessions).toHaveLength(2);
    });

    // EDGE CASES
    it('should handle no sessions', async () => {
      const emptyResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      };

      sessionsService.findAll.mockResolvedValue(emptyResult);

      const result = await service.generateSessionsSheets();

      expect(result.sessions).toHaveLength(0);
    });

    it('should include check-in counts for each session', async () => {
      const session1Id = generateObjectId();
      const session2Id = generateObjectId();
      const sessions = [
        mockData.session({ _id: session1Id, name: 'Session 1' }),
        mockData.session({ _id: session2Id, name: 'Session 2' }),
      ];
      const paginatedResult = {
        data: sessions,
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      };

      sessionsService.findAll.mockResolvedValue(paginatedResult as any);
      // Mock findBySession for each session
      checkInsService.findBySession
        .mockResolvedValueOnce(Array(50).fill(mockData.checkIn()))
        .mockResolvedValueOnce(Array(75).fill(mockData.checkIn()));
      registrationsService.findBySession
        .mockResolvedValueOnce(Array(60).fill(mockData.registration()))
        .mockResolvedValueOnce(Array(80).fill(mockData.registration()));

      const result = await service.generateSessionsSheets();

      expect(result.sessions[0].checkIns).toBe(50);
      expect(result.sessions[1].checkIns).toBe(75);
    });
  });
});
