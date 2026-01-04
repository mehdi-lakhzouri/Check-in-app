import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { CheckInRepository, CheckInAttemptRepository } from '../repositories';
import { 
  CreateCheckInDto, 
  QrCheckInDto, 
  CheckInFilterDto,
  VerifyQrDto,
  VerificationResult,
  VerificationBadge,
  AcceptCheckInDto,
  DeclineCheckInDto,
  CheckInAttemptFilterDto,
} from '../dto';
import { 
  CheckInDocument, 
  CheckInMethod, 
  CheckInBadge,
  CheckInAttemptDocument,
  AttemptStatus,
} from '../schemas';
import { 
  EntityNotFoundException, 
  EntityExistsException, 
  ValidationException,
} from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';
import { ParticipantsService } from '../../participants/services';
import { SessionsService } from '../../sessions/services';
import { RegistrationsService } from '../../registrations/services';
import { PinoLoggerService, getCurrentRequestId } from '../../../common/logger';

/**
 * Enhanced check-in response with capacity information
 */
export interface CheckInResult {
  checkIn: CheckInDocument;
  capacityInfo: {
    capacity: number;
    checkInsCount: number;
    remaining: number;
    percentFull: number;
    isNearCapacity: boolean;
  };
  wasRegistered?: boolean;
}

/**
 * Decline result response
 */
export interface DeclineResult {
  attempt: CheckInAttemptDocument;
  participant: {
    _id: string;
    name: string;
    email: string;
  };
  session: {
    _id: string;
    name: string;
  };
}

@Injectable()
export class CheckInsService {
  private readonly logger: PinoLoggerService;
  private readonly lateThresholdMinutes: number;

  constructor(
    private readonly checkInRepository: CheckInRepository,
    private readonly attemptRepository: CheckInAttemptRepository,
    @Inject(forwardRef(() => ParticipantsService))
    private readonly participantsService: ParticipantsService,
    @Inject(forwardRef(() => SessionsService))
    private readonly sessionsService: SessionsService,
    @Inject(forwardRef(() => RegistrationsService))
    private readonly registrationsService: RegistrationsService,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(CheckInsService.name);
    this.lateThresholdMinutes = this.configService.get<number>('app.checkinLateThresholdMinutes', 10);
    this.logger.debug('Late check-in threshold configured', { minutes: this.lateThresholdMinutes });
  }

  /**
   * Determines if a check-in is late based on session start time and threshold
   */
  private isCheckInLate(checkInTime: Date, sessionStartTime: Date): boolean {
    const thresholdMs = this.lateThresholdMinutes * 60 * 1000;
    const lateThreshold = new Date(sessionStartTime.getTime() + thresholdMs);
    return checkInTime > lateThreshold;
  }

  // ============================================================================
  // VERIFICATION & WORKFLOW METHODS
  // ============================================================================

  /**
   * Verify participant registration status for a session via QR code
   * This is the first step in the check-in workflow
   */
  async verifyQr(verifyDto: VerifyQrDto): Promise<VerificationResult> {
    this.logger.log('QR verification requested', {
      reqId: getCurrentRequestId(),
      qrCode: verifyDto.qrCode.substring(0, 6) + '***',
      sessionId: verifyDto.sessionId,
    });

    // Find participant by QR code
    const participant = await this.participantsService.findByQrCode(verifyDto.qrCode);
    
    // Find session
    const session = await this.sessionsService.findOne(verifyDto.sessionId);

    // Check if already checked in
    const existingCheckIn = await this.checkInRepository.findByParticipantAndSession(
      participant._id.toString(),
      verifyDto.sessionId,
    );

    // Check registration status
    const registrationCheck = await this.registrationsService.isParticipantRegistered(
      participant._id.toString(),
      verifyDto.sessionId,
    );

    // Determine verification badge
    let badge: VerificationBadge;
    let canAccept = true;
    let canDecline = true;
    let acceptLabel = 'Check In';
    let declineLabel = 'Decline';

    if (existingCheckIn) {
      badge = VerificationBadge.ALREADY_CHECKED_IN;
      canAccept = false;
      canDecline = false;
    } else if (registrationCheck.isRegistered) {
      badge = VerificationBadge.REGISTERED;
      acceptLabel = 'Check In';
      declineLabel = 'Decline';
    } else {
      badge = VerificationBadge.NOT_REGISTERED;
      acceptLabel = 'Accept Anyway';
      declineLabel = 'Decline Entry';
    }

    // Check if session is open
    if (!session.isOpen) {
      canAccept = false;
      declineLabel = 'Session Closed';
    }

    this.logger.log('QR verification complete', {
      reqId: getCurrentRequestId(),
      participantId: participant._id.toString(),
      sessionId: verifyDto.sessionId,
      badge,
      isRegistered: registrationCheck.isRegistered,
    });

    return {
      participant: {
        _id: participant._id.toString(),
        name: participant.name,
        email: participant.email,
        organization: participant.organization,
        qrCode: participant.qrCode,
      },
      session: {
        _id: session._id.toString(),
        name: session.name,
        isOpen: session.isOpen,
        requiresRegistration: session.requiresRegistration,
      },
      verification: {
        isRegistered: registrationCheck.isRegistered,
        registrationStatus: registrationCheck.status || null,
        isAlreadyCheckedIn: !!existingCheckIn,
        ...(existingCheckIn && {
          existingCheckIn: {
            _id: existingCheckIn._id.toString(),
            checkInTime: existingCheckIn.checkInTime,
            method: existingCheckIn.method,
          },
        }),
        badge,
      },
      actions: {
        canAccept,
        canDecline,
        acceptLabel,
        declineLabel,
      },
    };
  }

  /**
   * Accept and create a check-in after verification
   * Handles both registered and unregistered participants
   */
  async acceptCheckIn(acceptDto: AcceptCheckInDto): Promise<CheckInResult> {
    this.logger.log('Accepting check-in', {
      reqId: getCurrentRequestId(),
      participantId: acceptDto.participantId,
      sessionId: acceptDto.sessionId,
    });

    // Verify session exists and is open
    const session = await this.sessionsService.findOne(acceptDto.sessionId);
    if (!session.isOpen) {
      throw new ValidationException([
        { field: 'sessionId', message: 'Session is not open for check-ins' },
      ]);
    }

    // Verify participant exists
    const participant = await this.participantsService.findOne(acceptDto.participantId);

    // Check registration status
    const registrationCheck = await this.registrationsService.isParticipantRegistered(
      acceptDto.participantId,
      acceptDto.sessionId,
    );

    // Determine badge based on registration
    const badge = registrationCheck.isRegistered 
      ? CheckInBadge.ACCEPTED 
      : CheckInBadge.ACCEPTED_UNREGISTERED;

    // Reserve capacity slot
    const reservation = await this.sessionsService.reserveCapacitySlot(acceptDto.sessionId);
    if (!reservation.success) {
      throw new ValidationException([
        { 
          field: 'sessionId', 
          message: `Session is at full capacity (${reservation.capacity} participants).` 
        },
      ]);
    }

    // Create check-in
    const checkInTime = new Date();
    const isLate = this.isCheckInLate(checkInTime, new Date(session.startTime));

    let checkIn: CheckInDocument;
    try {
      checkIn = await this.checkInRepository.create({
        participantId: new Types.ObjectId(acceptDto.participantId),
        sessionId: new Types.ObjectId(acceptDto.sessionId),
        method: CheckInMethod.QR,
        checkedInBy: acceptDto.checkedInBy,
        notes: acceptDto.notes,
        checkInTime,
        isLate,
        badge,
        wasRegistered: registrationCheck.isRegistered,
      });
    } catch (error: any) {
      // Release slot on failure
      if (reservation.capacity > 0) {
        await this.sessionsService.releaseCapacitySlot(acceptDto.sessionId);
      }

      if (error.code === 11000) {
        throw new EntityExistsException(
          'CheckIn',
          'participant-session',
          `Participant ${participant.name} is already checked in to this session`,
        );
      }
      throw error;
    }

    // For unlimited capacity, increment count
    if (reservation.capacity === 0) {
      await this.sessionsService.incrementCheckInCount(acceptDto.sessionId);
    }

    this.logger.log('Check-in accepted', {
      reqId: getCurrentRequestId(),
      checkInId: checkIn._id.toString(),
      participantId: acceptDto.participantId,
      sessionId: acceptDto.sessionId,
      badge,
      wasRegistered: registrationCheck.isRegistered,
      isLate,
    });

    return {
      checkIn,
      capacityInfo: {
        capacity: reservation.capacity,
        checkInsCount: reservation.checkInsCount,
        remaining: reservation.remaining,
        percentFull: reservation.percentFull,
        isNearCapacity: reservation.isNearCapacity,
      },
      wasRegistered: registrationCheck.isRegistered,
    };
  }

  /**
   * Decline a check-in and log the attempt
   */
  async declineCheckIn(declineDto: DeclineCheckInDto): Promise<DeclineResult> {
    this.logger.log('Declining check-in', {
      reqId: getCurrentRequestId(),
      participantId: declineDto.participantId,
      sessionId: declineDto.sessionId,
      reason: declineDto.reason,
    });

    // Verify participant and session exist
    const participant = await this.participantsService.findOne(declineDto.participantId);
    const session = await this.sessionsService.findOne(declineDto.sessionId);

    // Check registration status
    const registrationCheck = await this.registrationsService.isParticipantRegistered(
      declineDto.participantId,
      declineDto.sessionId,
    );

    // Create attempt record
    const attempt = await this.attemptRepository.create({
      participantId: new Types.ObjectId(declineDto.participantId),
      sessionId: new Types.ObjectId(declineDto.sessionId),
      attemptTime: new Date(),
      status: AttemptStatus.DECLINED,
      declinedBy: declineDto.declinedBy,
      reason: declineDto.reason || 'Check-in declined by officer',
      wasRegistered: registrationCheck.isRegistered,
    });

    this.logger.log('Check-in declined', {
      reqId: getCurrentRequestId(),
      attemptId: attempt._id.toString(),
      participantId: declineDto.participantId,
      sessionId: declineDto.sessionId,
      reason: declineDto.reason,
      declinedBy: declineDto.declinedBy,
      wasRegistered: registrationCheck.isRegistered,
    });

    return {
      attempt,
      participant: {
        _id: participant._id.toString(),
        name: participant.name,
        email: participant.email,
      },
      session: {
        _id: session._id.toString(),
        name: session.name,
      },
    };
  }

  /**
   * Get check-in attempts with filtering
   */
  async getAttempts(filterDto: CheckInAttemptFilterDto): Promise<PaginatedResult<CheckInAttemptDocument>> {
    return this.attemptRepository.findWithFilters(filterDto);
  }

  /**
   * Get attempt statistics for a session
   */
  async getAttemptStats(sessionId?: string): Promise<{
    total: number;
    declined: number;
    failed: number;
  }> {
    return this.attemptRepository.getAttemptStats(sessionId);
  }

  /**
   * Create a check-in with comprehensive validations:
   * 1. Session must be open
   * 2. Participant must exist
   * 3. If session requires registration, verify registration exists and is confirmed
   * 4. If capacity is enforced, RESERVE slot atomically FIRST
   * 5. Create check-in record
   * 6. On failure: release reserved slot
   * 
   * Uses RESERVE-BEFORE-WRITE pattern to prevent race conditions:
   * - Reserve capacity slot FIRST (atomic via MongoDB)
   * - Create check-in record SECOND
   * - Rollback (release slot) if creation fails
   */
  async create(createCheckInDto: CreateCheckInDto): Promise<CheckInResult> {
    this.logger.log('Creating check-in', { 
      participantId: createCheckInDto.participantId, 
      sessionId: createCheckInDto.sessionId,
      reqId: getCurrentRequestId() 
    });

    // Step 1: Verify session exists and is open
    const session = await this.sessionsService.findOne(createCheckInDto.sessionId);
    if (!session.isOpen) {
      throw new ValidationException([
        { field: 'sessionId', message: 'Session is not open for check-ins' },
      ]);
    }

    // Step 2: Verify participant exists
    const participant = await this.participantsService.findOne(createCheckInDto.participantId);

    // Step 3: Check registration requirement for closed sessions
    if (session.requiresRegistration) {
      const registrationCheck = await this.registrationsService.isParticipantRegistered(
        createCheckInDto.participantId,
        createCheckInDto.sessionId,
      );

      if (!registrationCheck.isRegistered) {
        if (!registrationCheck.registration) {
          throw new ValidationException([
            { 
              field: 'participantId', 
              message: 'Participant is not registered for this session. This is an invite-only workshop.' 
            },
          ]);
        } else {
          throw new ValidationException([
            { 
              field: 'participantId', 
              message: `Registration status is "${registrationCheck.status}". Only confirmed registrations can check in.` 
            },
          ]);
        }
      }
    }

    // STEP 4: RESERVE CAPACITY SLOT FIRST (atomic)
    // This is the key fix for the race condition - reserve BEFORE creating the check-in
    const reservation = await this.sessionsService.reserveCapacitySlot(createCheckInDto.sessionId);
    
    // Check if reservation was rejected (capacity reached)
    // Note: For unlimited capacity (capacity=0), reservation.success is always true
    if (!reservation.success) {
      throw new ValidationException([
        { 
          field: 'sessionId', 
          message: `Session is at full capacity (${reservation.capacity} participants). Cannot accept more check-ins.` 
        },
      ]);
    }

    // Determine if check-in is late
    const checkInTime = new Date();
    const isLate = this.isCheckInLate(checkInTime, new Date(session.startTime));

    if (isLate) {
      this.logger.log(`Check-in is late (threshold: ${this.lateThresholdMinutes} min after session start)`);
    }

    // STEP 5: Create check-in AFTER reservation
    // Use try-catch to handle creation failures and rollback reservation
    let checkIn: CheckInDocument;
    try {
      checkIn = await this.checkInRepository.create({
        ...createCheckInDto,
        participantId: new Types.ObjectId(createCheckInDto.participantId),
        sessionId: new Types.ObjectId(createCheckInDto.sessionId),
        method: createCheckInDto.method || CheckInMethod.MANUAL,
        checkInTime,
        isLate,
      });
    } catch (error: any) {
      // STEP 6: ROLLBACK - Release reserved slot on failure
      this.logger.warn(`Check-in creation failed, releasing capacity slot: ${error.message}`);
      
      // Only release if capacity is limited (for unlimited, nothing was reserved)
      if (reservation.capacity > 0) {
        await this.sessionsService.releaseCapacitySlot(createCheckInDto.sessionId);
      }

      // Handle MongoDB duplicate key error (E11000)
      if (error.code === 11000) {
        throw new EntityExistsException(
          'CheckIn',
          'participant-session',
          `Participant ${participant.name} is already checked in to this session`,
        );
      }
      throw error;
    }

    // For unlimited capacity sessions, increment count (reservation didn't increment)
    if (reservation.capacity === 0) {
      await this.sessionsService.incrementCheckInCount(createCheckInDto.sessionId);
    }

    this.logger.log(`Check-in created with ID: ${checkIn._id} for ${participant.name}`);

    // Return check-in with capacity info from reservation
    return {
      checkIn,
      capacityInfo: {
        capacity: reservation.capacity,
        checkInsCount: reservation.checkInsCount,
        remaining: reservation.remaining,
        percentFull: reservation.percentFull,
        isNearCapacity: reservation.isNearCapacity,
      },
    };
  }

  /**
   * QR code based check-in
   */
  async checkInByQr(qrCheckInDto: QrCheckInDto): Promise<CheckInResult> {
    this.logger.log(
      `QR check-in for code ${qrCheckInDto.qrCode} in session ${qrCheckInDto.sessionId}`,
    );

    // Find participant by QR code
    const participant = await this.participantsService.findByQrCode(qrCheckInDto.qrCode);

    // Create check-in
    return this.create({
      participantId: participant._id.toString(),
      sessionId: qrCheckInDto.sessionId,
      method: CheckInMethod.QR,
      checkedInBy: qrCheckInDto.checkedInBy,
    });
  }

  async findAll(filterDto: CheckInFilterDto): Promise<PaginatedResult<CheckInDocument>> {
    this.logger.log(`Finding check-ins with filters: ${JSON.stringify(filterDto)}`);
    return this.checkInRepository.findWithFilters(filterDto);
  }

  async findOne(id: string): Promise<CheckInDocument> {
    const checkIn = await this.checkInRepository.findWithPopulate(id);

    if (!checkIn) {
      throw new EntityNotFoundException('CheckIn', id);
    }

    return checkIn;
  }

  async findByParticipant(participantId: string): Promise<CheckInDocument[]> {
    return this.checkInRepository.findByParticipant(participantId);
  }

  async findBySession(sessionId: string): Promise<CheckInDocument[]> {
    return this.checkInRepository.findBySession(sessionId);
  }

  async remove(id: string): Promise<CheckInDocument> {
    this.logger.log(`Deleting check-in: ${id}`);

    const checkIn = await this.checkInRepository.findById(id);
    
    if (!checkIn) {
      throw new EntityNotFoundException('CheckIn', id);
    }

    await this.checkInRepository.deleteById(id);

    // Decrement session check-in count
    await this.sessionsService.decrementCheckInCount(checkIn.sessionId.toString());

    this.logger.log(`Check-in deleted: ${id}`);
    return checkIn;
  }

  async removeBySession(sessionId: string): Promise<number> {
    this.logger.log(`Deleting all check-ins for session: ${sessionId}`);
    const count = await this.checkInRepository.deleteBySession(sessionId);
    
    // Reset session check-in count after bulk delete
    await this.sessionsService.reconcileCheckInCount(sessionId, 0);
    
    return count;
  }

  async removeByParticipant(participantId: string): Promise<number> {
    this.logger.log(`Deleting all check-ins for participant: ${participantId}`);
    return this.checkInRepository.deleteByParticipant(participantId);
  }

  async getStats(sessionId?: string): Promise<{
    total: number;
    qr: number;
    manual: number;
  }> {
    return this.checkInRepository.getCheckInStats(sessionId);
  }

  async getRecentCheckIns(limit = 10, sessionId?: string): Promise<CheckInDocument[]> {
    return this.checkInRepository.getRecentCheckIns(limit, sessionId);
  }

  async countBySession(sessionId: string): Promise<number> {
    return this.checkInRepository.countBySession(sessionId);
  }

  async isCheckedIn(participantId: string, sessionId: string): Promise<boolean> {
    const checkIn = await this.checkInRepository.findByParticipantAndSession(
      participantId,
      sessionId,
    );
    return !!checkIn;
  }

  /**
   * Reconcile check-in counts for all sessions
   * Used by background job to fix any inconsistencies
   */
  async reconcileAllSessionCounts(): Promise<{ sessionId: string; expected: number; actual: number; fixed: boolean }[]> {
    this.logger.log('Starting reconciliation of all session check-in counts');
    
    const sessions = await this.sessionsService.findAll({ limit: 10000 });
    const results: { sessionId: string; expected: number; actual: number; fixed: boolean }[] = [];

    for (const session of sessions.data) {
      const actualCount = await this.countBySession(session._id.toString());
      const storedCount = session.checkInsCount;

      if (actualCount !== storedCount) {
        this.logger.warn(
          `Inconsistency found for session ${session._id}: stored=${storedCount}, actual=${actualCount}`
        );
        await this.sessionsService.reconcileCheckInCount(session._id.toString(), actualCount);
        results.push({
          sessionId: session._id.toString(),
          expected: storedCount,
          actual: actualCount,
          fixed: true,
        });
      } else {
        results.push({
          sessionId: session._id.toString(),
          expected: storedCount,
          actual: actualCount,
          fixed: false,
        });
      }
    }

    this.logger.log(`Reconciliation complete. Fixed ${results.filter(r => r.fixed).length} inconsistencies`);
    return results;
  }
}
