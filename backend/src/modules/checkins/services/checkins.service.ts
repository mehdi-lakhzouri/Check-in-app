import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
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
import { SessionDocument } from '../../sessions/schemas';

// ============================================================================
// DOMAIN TYPES & INTERFACES
// ============================================================================

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

/**
 * Internal context for check-in operations (immutable after creation)
 */
interface CheckInContext {
  readonly participantId: string;
  readonly sessionId: string;
  readonly session: SessionDocument;
  readonly isRegistered: boolean;
  readonly registrationStatus: string | null;
  readonly checkInTime: Date;
  readonly isLate: boolean;
  readonly method: CheckInMethod;
  readonly checkedInBy?: string;
  readonly notes?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * CheckInsService - Principal Backend Engineer Redesign
 *
 * Design Principles:
 * 1. ACID Compliance - All mutating operations use MongoDB transactions (when available)
 * 2. Idempotency - Duplicate check-in requests return existing record gracefully
 * 3. Deterministic Behavior - Same inputs always produce same outputs under retries
 * 4. Clean Separation - Clear boundaries between validation, business logic, and persistence
 * 5. Multi-Pod Scalability - Atomic operations prevent race conditions
 * 6. High Testability - Pure functions where possible, injectable dependencies
 */
@Injectable()
export class CheckInsService {
  private readonly logger: PinoLoggerService;
  private readonly lateThresholdMinutes: number;
  private readonly isTestEnvironment: boolean;

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
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(CheckInsService.name);
    this.lateThresholdMinutes = this.configService.get<number>(
      'app.checkinLateThresholdMinutes',
      10,
    );
    this.isTestEnvironment = process.env.NODE_ENV === 'test';
    this.logger.debug('CheckInsService initialized', {
      lateThresholdMinutes: this.lateThresholdMinutes,
      environment: process.env.NODE_ENV,
    });
  }

  // ============================================================================
  // PRIVATE: PURE FUNCTIONS (Deterministic, No Side Effects)
  // ============================================================================

  /**
   * Get the late threshold minutes for a session (per-session override or global default)
   * Pure function - no side effects
   */
  private getLateThresholdForSession(session: SessionDocument): number {
    if (
      session.lateThresholdMinutes !== undefined &&
      session.lateThresholdMinutes !== null
    ) {
      return session.lateThresholdMinutes;
    }
    return this.lateThresholdMinutes;
  }

  /**
   * Determines if a check-in is late based on session start time and threshold
   * Pure function - deterministic output for same inputs
   */
  private calculateIsLate(
    checkInTime: Date,
    session: SessionDocument,
  ): boolean {
    const thresholdMinutes = this.getLateThresholdForSession(session);
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const lateThreshold = new Date(
      new Date(session.startTime).getTime() + thresholdMs,
    );
    return checkInTime > lateThreshold;
  }

  /**
   * Determine badge based on registration status
   * Pure function
   */
  private determineBadge(isRegistered: boolean): CheckInBadge {
    return isRegistered
      ? CheckInBadge.ACCEPTED
      : CheckInBadge.ACCEPTED_UNREGISTERED;
  }

  /**
   * Convert MongoDB duplicate key error to domain exception
   */
  private handleDuplicateKeyError(
    error: unknown,
    participantId: string,
  ): never {
    if (this.isDuplicateKeyError(error)) {
      throw new EntityExistsException(
        'CheckIn',
        'participant-session',
        `Participant ${participantId} is already checked in to this session`,
      );
    }
    throw error;
  }

  /**
   * Type guard for duplicate key errors
   */
  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }

  // ============================================================================
  // PRIVATE: VALIDATION LAYER
  // ============================================================================

  /**
   * Validate session is open for check-ins
   * Throws ValidationException if session is closed
   */
  private validateSessionOpen(session: SessionDocument): void {
    if (!session.isOpen) {
      throw new ValidationException([
        { field: 'sessionId', message: 'Session is not open for check-ins' },
      ]);
    }
  }

  /**
   * Validate registration requirement
   * Throws ValidationException if session requires registration and participant is not registered
   */
  private validateRegistrationRequirement(
    session: SessionDocument,
    isRegistered: boolean,
    registrationStatus: string | null,
    hasRegistration: boolean,
  ): void {
    if (!session.requiresRegistration) {
      return; // No registration required
    }

    if (!isRegistered) {
      if (!hasRegistration) {
        throw new ValidationException([
          {
            field: 'participantId',
            message:
              'Participant is not registered for this session. This is an invite-only workshop.',
          },
        ]);
      }
      throw new ValidationException([
        {
          field: 'participantId',
          message: `Registration status is "${registrationStatus}". Only confirmed registrations can check in.`,
        },
      ]);
    }
  }

  // ============================================================================
  // PRIVATE: IDEMPOTENCY LAYER
  // ============================================================================

  /**
   * Check for existing check-in (idempotency check)
   * Returns existing check-in if found, null otherwise
   */
  private async findExistingCheckIn(
    participantId: string,
    sessionId: string,
  ): Promise<CheckInDocument | null> {
    return this.checkInRepository.findByParticipantAndSession(
      participantId,
      sessionId,
    );
  }

  // ============================================================================
  // PRIVATE: TRANSACTION ORCHESTRATION
  // ============================================================================

  /**
   * Execute operation with transaction support (when available)
   * Falls back to non-transactional execution in test environment
   */
  private async executeWithTransaction<T>(
    operation: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    if (this.isTestEnvironment) {
      // Skip transactions in test environment (no replica set)
      return operation(undefined);
    }

    const session = await this.connection.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Build check-in context with all required validation
   * Centralizes context creation for consistent behavior
   */
  private async buildCheckInContext(
    participantId: string,
    sessionId: string,
    method: CheckInMethod = CheckInMethod.MANUAL,
    checkedInBy?: string,
    notes?: string,
  ): Promise<CheckInContext> {
    // Fetch required entities
    const [session, _participant, registrationCheck] = await Promise.all([
      this.sessionsService.findOne(sessionId),
      this.participantsService.findOne(participantId),
      this.registrationsService.isParticipantRegistered(
        participantId,
        sessionId,
      ),
    ]);

    // Calculate derived values
    const checkInTime = new Date();
    const isLate = this.calculateIsLate(checkInTime, session);

    return {
      participantId,
      sessionId,
      session,
      isRegistered: registrationCheck.isRegistered,
      registrationStatus: registrationCheck.status || null,
      checkInTime,
      isLate,
      method,
      checkedInBy,
      notes,
    };
  }

  // ============================================================================
  // PUBLIC: VERIFICATION WORKFLOW
  // ============================================================================

  /**
   * Verify participant registration status for a session via QR code
   * This is the first step in the check-in workflow
   * Read-only operation - no side effects
   */
  async verifyQr(verifyDto: VerifyQrDto): Promise<VerificationResult> {
    const reqId = getCurrentRequestId();
    this.logger.log('QR verification requested', {
      reqId,
      qrCode: verifyDto.qrCode.substring(0, 6) + '***',
      sessionId: verifyDto.sessionId,
    });

    // Fetch all required data in parallel (read-only, no transaction needed)
    const participant = await this.participantsService.findByQrCode(
      verifyDto.qrCode,
    );
    const [session, existingCheckIn, registrationCheck] = await Promise.all([
      this.sessionsService.findOne(verifyDto.sessionId),
      this.findExistingCheckIn(participant._id.toString(), verifyDto.sessionId),
      this.registrationsService.isParticipantRegistered(
        participant._id.toString(),
        verifyDto.sessionId,
      ),
    ]);

    // Determine verification badge and actions
    const { badge, canAccept, canDecline, acceptLabel, declineLabel } =
      this.determineVerificationActions(
        existingCheckIn,
        registrationCheck.isRegistered,
        session.isOpen,
      );

    // Check capacity
    const capacityResult = await this.checkCapacityForVerification(
      session,
      verifyDto.sessionId,
      !!existingCheckIn,
    );

    // Build final action state
    const finalCanAccept = canAccept && !capacityResult.isAtCapacity;
    const finalAcceptLabel =
      capacityResult.isAtCapacity && !existingCheckIn
        ? 'Session Full'
        : acceptLabel;

    this.logger.log('QR verification complete', {
      reqId,
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
        capacity: session.capacity || null,
        isAtCapacity: capacityResult.isAtCapacity,
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
        isAtCapacity: capacityResult.isAtCapacity,
      },
      actions: {
        canAccept: finalCanAccept,
        canDecline,
        acceptLabel: finalAcceptLabel,
        declineLabel,
      },
      ...(capacityResult.capacityInfo && {
        capacityInfo: capacityResult.capacityInfo,
      }),
    };
  }

  /**
   * Determine verification actions based on check-in state
   * Pure function
   */
  private determineVerificationActions(
    existingCheckIn: CheckInDocument | null,
    isRegistered: boolean,
    sessionIsOpen: boolean,
  ): {
    badge: VerificationBadge;
    canAccept: boolean;
    canDecline: boolean;
    acceptLabel: string;
    declineLabel: string;
  } {
    let badge: VerificationBadge;
    let canAccept = true;
    let canDecline = true;
    let acceptLabel = 'Check In';
    let declineLabel = 'Decline';

    if (existingCheckIn) {
      badge = VerificationBadge.ALREADY_CHECKED_IN;
      canAccept = false;
      canDecline = false;
    } else if (isRegistered) {
      badge = VerificationBadge.REGISTERED;
    } else {
      badge = VerificationBadge.NOT_REGISTERED;
      acceptLabel = 'Accept Anyway';
      declineLabel = 'Decline Entry';
    }

    if (!sessionIsOpen) {
      canAccept = false;
      declineLabel = 'Session Closed';
    }

    return { badge, canAccept, canDecline, acceptLabel, declineLabel };
  }

  /**
   * Check capacity for verification display
   */
  private async checkCapacityForVerification(
    session: SessionDocument,
    sessionId: string,
    hasExistingCheckIn: boolean,
  ): Promise<{
    isAtCapacity: boolean;
    capacityInfo: { current: number; max: number; remaining: number } | null;
  }> {
    if (
      !session.capacity ||
      session.capacity <= 0 ||
      session.capacityEnforced === false
    ) {
      return { isAtCapacity: false, capacityInfo: null };
    }

    const currentCount = await this.checkInRepository.countBySession(sessionId);
    const isAtCapacity =
      currentCount >= session.capacity && !hasExistingCheckIn;

    return {
      isAtCapacity,
      capacityInfo: {
        current: currentCount,
        max: session.capacity,
        remaining: Math.max(0, session.capacity - currentCount),
      },
    };
  }

  // ============================================================================
  // PUBLIC: ACCEPT CHECK-IN (QR Workflow Step 2)
  // ============================================================================

  /**
   * Accept and create a check-in after verification
   * Handles both registered and unregistered participants
   *
   * ACID Guarantees:
   * - Atomic capacity reservation
   * - Check-in creation within transaction
   * - Rollback on failure
   *
   * Idempotency:
   * - Returns existing check-in if already checked in
   */
  async acceptCheckIn(acceptDto: AcceptCheckInDto): Promise<CheckInResult> {
    const reqId = getCurrentRequestId();
    this.logger.log('Accepting check-in', {
      reqId,
      participantId: acceptDto.participantId,
      sessionId: acceptDto.sessionId,
    });

    // Build context (validates participant and session exist)
    const context = await this.buildCheckInContext(
      acceptDto.participantId,
      acceptDto.sessionId,
      CheckInMethod.QR,
      acceptDto.checkedInBy,
      acceptDto.notes,
    );

    // Validate session is open
    this.validateSessionOpen(context.session);

    // Check idempotency - return existing if already checked in
    const existingCheckIn = await this.findExistingCheckIn(
      acceptDto.participantId,
      acceptDto.sessionId,
    );
    if (existingCheckIn) {
      this.logger.log('Participant already checked in (idempotent return)', {
        reqId,
        checkInId: existingCheckIn._id.toString(),
      });
      return this.buildCheckInResultFromExisting(existingCheckIn);
    }

    // Execute check-in with transaction
    return this.executeCheckIn(context);
  }

  // ============================================================================
  // PUBLIC: DECLINE CHECK-IN
  // ============================================================================

  /**
   * Decline a check-in and log the attempt
   * Non-transactional (audit log only)
   */
  async declineCheckIn(declineDto: DeclineCheckInDto): Promise<DeclineResult> {
    const reqId = getCurrentRequestId();
    this.logger.log('Declining check-in', {
      reqId,
      participantId: declineDto.participantId,
      sessionId: declineDto.sessionId,
      reason: declineDto.reason,
    });

    // Verify entities exist
    const [participant, session, registrationCheck] = await Promise.all([
      this.participantsService.findOne(declineDto.participantId),
      this.sessionsService.findOne(declineDto.sessionId),
      this.registrationsService.isParticipantRegistered(
        declineDto.participantId,
        declineDto.sessionId,
      ),
    ]);

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
      reqId,
      attemptId: attempt._id.toString(),
      participantId: declineDto.participantId,
      sessionId: declineDto.sessionId,
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

  // ============================================================================
  // PUBLIC: DIRECT CHECK-IN (Manual/API)
  // ============================================================================

  /**
   * Create a check-in with comprehensive validations
   *
   * ACID Pattern: RESERVE-BEFORE-WRITE
   * 1. Validate session and participant
   * 2. Check registration requirement
   * 3. Reserve capacity slot (atomic)
   * 4. Create check-in record
   * 5. On failure: rollback (release slot)
   *
   * Note: Duplicate check-ins are rejected with EntityExistsException (409)
   * The unique index on (participantId, sessionId) enforces this at database level
   */
  async create(createCheckInDto: CreateCheckInDto): Promise<CheckInResult> {
    const reqId = getCurrentRequestId();
    this.logger.log('Creating check-in', {
      participantId: createCheckInDto.participantId,
      sessionId: createCheckInDto.sessionId,
      reqId,
    });

    // Build context (validates entities and fetches registration)
    const context = await this.buildCheckInContext(
      createCheckInDto.participantId,
      createCheckInDto.sessionId,
      createCheckInDto.method || CheckInMethod.MANUAL,
      createCheckInDto.checkedInBy,
      createCheckInDto.notes,
    );

    // Validate session is open
    this.validateSessionOpen(context.session);

    // Validate registration requirement
    const registrationCheck =
      await this.registrationsService.isParticipantRegistered(
        createCheckInDto.participantId,
        createCheckInDto.sessionId,
      );
    this.validateRegistrationRequirement(
      context.session,
      context.isRegistered,
      context.registrationStatus,
      !!registrationCheck.registration,
    );

    // Execute check-in with transaction
    // Duplicate check-ins are caught by the unique index and converted to EntityExistsException
    return this.executeCheckIn(context);
  }

  /**
   * Core check-in execution with transaction and capacity management
   */
  private async executeCheckIn(
    context: CheckInContext,
  ): Promise<CheckInResult> {
    const reqId = getCurrentRequestId();

    return this.executeWithTransaction(async (mongoSession?: ClientSession) => {
      // Step 1: Reserve capacity slot (atomic)
      const reservation = await this.sessionsService.reserveCapacitySlot(
        context.sessionId,
        mongoSession,
      );

      if (!reservation.success) {
        throw new ValidationException([
          {
            field: 'sessionId',
            message: `Session is at full capacity (${reservation.capacity} participants). Cannot accept more check-ins.`,
          },
        ]);
      }

      // Step 2: Create check-in record
      const badge = this.determineBadge(context.isRegistered);

      try {
        const checkIn = await this.checkInRepository.create(
          {
            participantId: new Types.ObjectId(context.participantId),
            sessionId: new Types.ObjectId(context.sessionId),
            method: context.method,
            checkedInBy: context.checkedInBy,
            notes: context.notes,
            checkInTime: context.checkInTime,
            isLate: context.isLate,
            badge,
            wasRegistered: context.isRegistered,
          },
          mongoSession,
        );

        // Step 3: For unlimited capacity, increment count explicitly
        if (reservation.capacity === 0) {
          await this.sessionsService.incrementCheckInCount(
            context.sessionId,
            mongoSession,
          );
        }

        this.logger.log('Check-in created', {
          reqId,
          checkInId: checkIn._id.toString(),
          participantId: context.participantId,
          sessionId: context.sessionId,
          badge,
          isLate: context.isLate,
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
          wasRegistered: context.isRegistered,
        };
      } catch (error) {
        // Rollback capacity reservation on failure
        if (reservation.capacity > 0) {
          try {
            await this.sessionsService.releaseCapacitySlot(context.sessionId);
          } catch (releaseError) {
            this.logger.error(
              `Failed to release capacity slot during rollback for session ${context.sessionId}`,
              releaseError instanceof Error
                ? releaseError.stack
                : String(releaseError),
              { reqId },
            );
          }
        }
        this.handleDuplicateKeyError(error, context.participantId);
      }
    });
  }

  /**
   * Build CheckInResult from existing check-in (for idempotent returns)
   */
  private async buildCheckInResultFromExisting(
    checkIn: CheckInDocument,
  ): Promise<CheckInResult> {
    const currentCount = await this.checkInRepository.countBySession(
      checkIn.sessionId.toString(),
    );
    const session = await this.sessionsService.findOne(
      checkIn.sessionId.toString(),
    );
    const capacity = session.capacity || 0;

    return {
      checkIn,
      capacityInfo: {
        capacity,
        checkInsCount: currentCount,
        remaining:
          capacity > 0 ? Math.max(0, capacity - currentCount) : Infinity,
        percentFull:
          capacity > 0 ? Math.round((currentCount / capacity) * 100) : 0,
        isNearCapacity: capacity > 0 && currentCount / capacity >= 0.9,
      },
      wasRegistered: checkIn.wasRegistered,
    };
  }

  // ============================================================================
  // PUBLIC: QR CODE CHECK-IN
  // ============================================================================

  /**
   * QR code based check-in
   * Resolves participant by QR code then delegates to create()
   */
  async checkInByQr(qrCheckInDto: QrCheckInDto): Promise<CheckInResult> {
    this.logger.log(`QR check-in for session ${qrCheckInDto.sessionId}`);

    // Find participant by QR code
    const participant = await this.participantsService.findByQrCode(
      qrCheckInDto.qrCode,
    );

    // Create check-in using standard flow
    return this.create({
      participantId: participant._id.toString(),
      sessionId: qrCheckInDto.sessionId,
      method: CheckInMethod.QR,
      checkedInBy: qrCheckInDto.checkedInBy,
    });
  }

  // ============================================================================
  // PUBLIC: QUERY METHODS (Read-Only)
  // ============================================================================

  /**
   * Get check-in attempts with filtering
   */
  async getAttempts(
    filterDto: CheckInAttemptFilterDto,
  ): Promise<PaginatedResult<CheckInAttemptDocument>> {
    return this.attemptRepository.findWithFilters(filterDto);
  }

  /**
   * Get attempt statistics for a session
   */
  async getAttemptStats(
    sessionId?: string,
  ): Promise<{ total: number; declined: number; failed: number }> {
    return this.attemptRepository.getAttemptStats(sessionId);
  }

  /**
   * Find all check-ins with pagination and filters
   */
  async findAll(
    filterDto: CheckInFilterDto,
  ): Promise<PaginatedResult<CheckInDocument>> {
    this.logger.log(
      `Finding check-ins with filters: ${JSON.stringify(filterDto)}`,
    );
    return this.checkInRepository.findWithFilters(filterDto);
  }

  /**
   * Find a single check-in by ID
   */
  async findOne(id: string): Promise<CheckInDocument> {
    const checkIn = await this.checkInRepository.findWithPopulate(id);
    if (!checkIn) {
      throw new EntityNotFoundException('CheckIn', id);
    }
    return checkIn;
  }

  /**
   * Find all check-ins for a participant
   */
  async findByParticipant(participantId: string): Promise<CheckInDocument[]> {
    return this.checkInRepository.findByParticipant(participantId);
  }

  /**
   * Find all check-ins for a session
   */
  async findBySession(sessionId: string): Promise<CheckInDocument[]> {
    return this.checkInRepository.findBySession(sessionId);
  }

  /**
   * Get check-in statistics
   */
  async getStats(
    sessionId?: string,
  ): Promise<{ total: number; qr: number; manual: number }> {
    return this.checkInRepository.getCheckInStats(sessionId);
  }

  /**
   * Get recent check-ins
   */
  async getRecentCheckIns(
    limit = 10,
    sessionId?: string,
  ): Promise<CheckInDocument[]> {
    return this.checkInRepository.getRecentCheckIns(limit, sessionId);
  }

  /**
   * Count check-ins for a session
   */
  async countBySession(sessionId: string): Promise<number> {
    return this.checkInRepository.countBySession(sessionId);
  }

  /**
   * Check if participant is checked in to a session
   */
  async isCheckedIn(
    participantId: string,
    sessionId: string,
  ): Promise<boolean> {
    const checkIn = await this.checkInRepository.findByParticipantAndSession(
      participantId,
      sessionId,
    );
    return !!checkIn;
  }

  // ============================================================================
  // PUBLIC: DELETE OPERATIONS
  // ============================================================================

  /**
   * Remove a check-in by ID
   * Updates session check-in count atomically
   */
  async remove(id: string): Promise<CheckInDocument> {
    this.logger.log(`Deleting check-in: ${id}`);

    const checkIn = await this.checkInRepository.findById(id);
    if (!checkIn) {
      throw new EntityNotFoundException('CheckIn', id);
    }

    await this.checkInRepository.deleteById(id);
    await this.sessionsService.decrementCheckInCount(
      checkIn.sessionId.toString(),
    );

    this.logger.log(`Check-in deleted: ${id}`);
    return checkIn;
  }

  /**
   * Remove all check-ins for a session (cascade delete)
   */
  async removeBySession(sessionId: string): Promise<number> {
    this.logger.log(`Deleting all check-ins for session: ${sessionId}`);
    const count = await this.checkInRepository.deleteBySession(sessionId);
    await this.sessionsService.reconcileCheckInCount(sessionId, 0);
    return count;
  }

  /**
   * Remove all check-ins for a participant (cascade delete)
   */
  async removeByParticipant(participantId: string): Promise<number> {
    this.logger.log(`Deleting all check-ins for participant: ${participantId}`);

    // Get all check-ins to update session counts
    const checkIns =
      await this.checkInRepository.findByParticipant(participantId);

    // Group by session and count
    const sessionCounts = new Map<string, number>();
    for (const checkIn of checkIns) {
      const sessionId = checkIn.sessionId.toString();
      sessionCounts.set(sessionId, (sessionCounts.get(sessionId) || 0) + 1);
    }

    // Delete all check-ins
    const count =
      await this.checkInRepository.deleteByParticipant(participantId);

    // Update session counts
    for (const [sessionId, deleteCount] of sessionCounts) {
      try {
        await this.sessionsService.decrementCheckInCount(
          sessionId,
          deleteCount,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to update check-in count for session ${sessionId}`,
          {
            error: errorMessage,
            participantId,
          },
        );
      }
    }

    this.logger.log(
      `Deleted ${count} check-ins for participant: ${participantId}`,
    );
    return count;
  }

  /**
   * Delete all check-in attempts for a session (cascade delete)
   */
  async removeAttemptsBySession(sessionId: string): Promise<number> {
    this.logger.log(`Deleting all check-in attempts for session: ${sessionId}`);
    const count = await this.attemptRepository.deleteBySession(sessionId);
    this.logger.log(
      `Deleted ${count} check-in attempts for session: ${sessionId}`,
    );
    return count;
  }

  /**
   * Delete all check-in attempts for a participant (cascade delete)
   */
  async removeAttemptsByParticipant(participantId: string): Promise<number> {
    this.logger.log(
      `Deleting all check-in attempts for participant: ${participantId}`,
    );
    const count =
      await this.attemptRepository.deleteByParticipant(participantId);
    this.logger.log(
      `Deleted ${count} check-in attempts for participant: ${participantId}`,
    );
    return count;
  }

  // ============================================================================
  // PUBLIC: RECONCILIATION (Admin/System Operations)
  // ============================================================================

  /**
   * Reconcile check-in counts for all sessions
   * Used by background job to fix any inconsistencies (Zombie Reservations)
   * Optimization: Uses cursor-style pagination to avoid OOM
   */
  async reconcileAllSessionCounts(): Promise<
    { sessionId: string; expected: number; actual: number; fixed: boolean }[]
  > {
    this.logger.log('Starting reconciliation of all session check-in counts');

    const results: {
      sessionId: string;
      expected: number;
      actual: number;
      fixed: boolean;
    }[] = [];

    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await this.sessionsService.findAll({ page, limit });

      for (const session of result.data) {
        const actualCount = await this.checkInRepository.countBySession(
          session._id.toString(),
        );
        const storedCount = session.checkInsCount;

        if (actualCount !== storedCount) {
          this.logger.warn(`Inconsistency found for session ${session._id}`, {
            stored: storedCount,
            actual: actualCount,
            reqId: getCurrentRequestId(),
          });

          await this.sessionsService.reconcileCheckInCount(
            session._id.toString(),
            actualCount,
          );

          results.push({
            sessionId: session._id.toString(),
            expected: actualCount,
            actual: storedCount,
            fixed: true,
          });
        }
      }

      hasMore = page < result.meta.totalPages;
      page++;
    }

    if (results.length > 0) {
      this.logger.warn(
        `Reconciliation complete: Fixed ${results.length} sessions with inconsistent counts`,
      );
    } else {
      this.logger.log('Reconciliation complete: No inconsistencies found');
    }

    return results;
  }
}
