import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { ParticipantRepository } from '../repositories';
import {
  CreateParticipantDto,
  UpdateParticipantDto,
  ParticipantFilterDto,
  BulkParticipantItemDto,
} from '../dto';
import { ParticipantDocument, ParticipantStatus } from '../schemas';
import {
  EntityNotFoundException,
  EntityExistsException,
  ValidationException,
} from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';
import { CheckInsService } from '../../checkins/services';
import { RegistrationsService } from '../../registrations/services';
import { PinoLoggerService } from '../../../common/logger';

// Environment-prefixed cache keys to prevent collisions across environments
const ENV_PREFIX = process.env.NODE_ENV || 'development';
const APP_PREFIX = process.env.REDIS_KEY_PREFIX || 'checkin';

const CACHE_KEYS = {
  PARTICIPANT_BY_ID: `${APP_PREFIX}:${ENV_PREFIX}:participant:byId:`,
  PARTICIPANT_BY_QR: `${APP_PREFIX}:${ENV_PREFIX}:participant:byQr:`,
  PARTICIPANT_BY_EMAIL: `${APP_PREFIX}:${ENV_PREFIX}:participant:byEmail:`,
  PARTICIPANT_STATS: `${APP_PREFIX}:${ENV_PREFIX}:participant:stats`,
  AMBASSADOR_LEADERBOARD: `${APP_PREFIX}:${ENV_PREFIX}:participant:ambassador:leaderboard`,
} as const;

/**
 * Cache wrapper interface for sentinel pattern
 * Distinguishes between cached null values and cache misses
 */
interface CacheWrapper<T> {
  data: T;
  cachedAt: number;
}

@Injectable()
export class ParticipantsService implements OnModuleInit {
  private readonly logger: PinoLoggerService;
  private readonly participantTtl: number;
  private readonly statsTtl: number;

  // Singleflight pattern: track in-flight requests to prevent cache stampede
  private readonly pendingRequests = new Map<string, Promise<any>>();

  constructor(
    private readonly participantRepository: ParticipantRepository,
    @Inject(forwardRef(() => CheckInsService))
    private readonly checkInsService: CheckInsService,
    @Inject(forwardRef(() => RegistrationsService))
    private readonly registrationsService: RegistrationsService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(ParticipantsService.name);
    // Load TTL from config (defaults: 10 min for participants, 30s for stats)
    this.participantTtl = this.configService.get<number>(
      'redis.cache.participantTtl',
      600000,
    );
    this.statsTtl = this.configService.get<number>(
      'redis.cache.statsTtl',
      30000,
    );
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('ParticipantsService initialized with Redis caching');
  }

  /**
   * Singleflight pattern: Coalesce concurrent requests for the same cache key
   * Prevents cache stampede by ensuring only one request hits the database
   */
  private async withSingleflight<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.logger.debug(`Singleflight: coalescing request for ${key}`);
      return pending as Promise<T>;
    }

    const promise = factory().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Invalidate all cache entries for a participant
   * Wrapped in try-catch to prevent cache failures from breaking operations
   */
  private async invalidateParticipantCache(
    participant: ParticipantDocument,
  ): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(
          `${CACHE_KEYS.PARTICIPANT_BY_ID}${participant._id}`,
        ),
        this.cacheManager.del(
          `${CACHE_KEYS.PARTICIPANT_BY_QR}${participant.qrCode}`,
        ),
        this.cacheManager.del(
          `${CACHE_KEYS.PARTICIPANT_BY_EMAIL}${participant.email}`,
        ),
        this.cacheManager.del(CACHE_KEYS.PARTICIPANT_STATS),
      ]);
    } catch (error) {
      this.logger.warn(
        `Cache invalidation failed for participant ${participant._id}: ${error.message}`,
      );
      // Continue - cache invalidation failure should not break the operation
    }
  }

  async create(
    createParticipantDto: CreateParticipantDto,
  ): Promise<ParticipantDocument> {
    this.logger.log(`Creating participant: ${createParticipantDto.email}`);

    // Check for existing email
    const existing = await this.participantRepository.findByEmail(
      createParticipantDto.email,
    );
    if (existing) {
      throw new EntityExistsException(
        'Participant',
        'email',
        createParticipantDto.email,
      );
    }

    // Use provided QR code or generate a unique one
    let qrCode = createParticipantDto.qrCode;

    if (qrCode) {
      // Validate that the provided QR code doesn't already exist
      const existingQr = await this.participantRepository.findByQrCode(qrCode);
      if (existingQr) {
        throw new EntityExistsException('Participant', 'qrCode', qrCode);
      }
    } else {
      // Generate unique QR code if not provided
      qrCode = await this.generateUniqueQrCode();
    }

    // Extract qrCode from DTO to avoid overwriting
    const { qrCode: _, ...participantData } = createParticipantDto;

    const participant = await this.participantRepository.create({
      ...participantData,
      qrCode,
    });

    this.logger.log(`Participant created with ID: ${participant._id}`);
    return participant;
  }

  async findAll(
    filterDto: ParticipantFilterDto,
  ): Promise<PaginatedResult<ParticipantDocument>> {
    this.logger.log(
      `Finding participants with filters: ${JSON.stringify(filterDto)}`,
    );
    return this.participantRepository.findWithFilters(filterDto);
  }

  /**
   * Find participant by ID with Redis caching using sentinel pattern
   * Properly distinguishes between cache miss and cached null values
   */
  async findOne(id: string): Promise<ParticipantDocument> {
    const cacheKey = `${CACHE_KEYS.PARTICIPANT_BY_ID}${id}`;

    try {
      // Try cache first with sentinel pattern
      const cached =
        await this.cacheManager.get<CacheWrapper<ParticipantDocument | null>>(
          cacheKey,
        );

      // Explicit cache hit check using sentinel pattern
      if (
        cached &&
        typeof cached === 'object' &&
        'data' in cached &&
        'cachedAt' in cached
      ) {
        if (cached.data === null) {
          throw new EntityNotFoundException('Participant', id);
        }
        this.logger.debug(`Cache HIT for participant ID: ${id}`);
        return cached.data;
      }
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.warn(`Cache read failed for ${cacheKey}: ${error.message}`);
    }

    // Cache miss - fetch from database
    this.logger.debug(`Cache MISS for participant ID: ${id}`);
    const participant = await this.participantRepository.findById(id);

    // Cache with wrapper (including null results to prevent repeated DB lookups)
    // Wrapped in try-catch to prevent cache failures from crashing requests
    try {
      await this.cacheManager.set(
        cacheKey,
        {
          data: participant,
          cachedAt: Date.now(),
        },
        this.participantTtl,
      );
    } catch (cacheError) {
      this.logger.warn(
        `Cache write failed for ${cacheKey}: ${cacheError.message}`,
      );
    }

    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }

    return participant;
  }

  /**
   * Find participant by QR code with Redis caching using sentinel pattern
   * This is the HOT PATH - called on every QR scan during check-in
   */
  async findByQrCode(qrCode: string): Promise<ParticipantDocument> {
    const cacheKey = `${CACHE_KEYS.PARTICIPANT_BY_QR}${qrCode}`;

    try {
      // Try cache first with sentinel pattern - critical for check-in performance
      const cached =
        await this.cacheManager.get<CacheWrapper<ParticipantDocument | null>>(
          cacheKey,
        );

      if (
        cached &&
        typeof cached === 'object' &&
        'data' in cached &&
        'cachedAt' in cached
      ) {
        if (cached.data === null) {
          throw new EntityNotFoundException('Participant', `qrCode: ${qrCode}`);
        }
        this.logger.debug(`Cache HIT for QR code lookup`);
        return cached.data;
      }
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.warn(`Cache read failed for ${cacheKey}: ${error.message}`);
    }

    // Cache miss - fetch from database
    this.logger.debug(`Cache MISS for QR code lookup`);
    const participant = await this.participantRepository.findByQrCode(qrCode);

    // Cache with wrapper (including null results)
    try {
      await this.cacheManager.set(
        cacheKey,
        {
          data: participant,
          cachedAt: Date.now(),
        },
        this.participantTtl,
      );
    } catch (cacheError) {
      this.logger.warn(
        `Cache write failed for ${cacheKey}: ${cacheError.message}`,
      );
    }

    if (!participant) {
      throw new EntityNotFoundException('Participant', `qrCode: ${qrCode}`);
    }

    return participant;
  }

  /**
   * Find participant by email with Redis caching using sentinel pattern
   * Returns null if not found (doesn't throw)
   */
  async findByEmail(email: string): Promise<ParticipantDocument | null> {
    const cacheKey = `${CACHE_KEYS.PARTICIPANT_BY_EMAIL}${email.toLowerCase()}`;

    try {
      // Try cache first with sentinel pattern
      const cached =
        await this.cacheManager.get<CacheWrapper<ParticipantDocument | null>>(
          cacheKey,
        );

      if (
        cached &&
        typeof cached === 'object' &&
        'data' in cached &&
        'cachedAt' in cached
      ) {
        this.logger.debug(`Cache HIT for email lookup`);
        return cached.data; // Can be null for non-existent emails
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for ${cacheKey}: ${error.message}`);
    }

    // Cache miss - fetch from database
    const participant = await this.participantRepository.findByEmail(email);

    // Cache with wrapper (including null results to prevent repeated DB lookups)
    try {
      await this.cacheManager.set(
        cacheKey,
        {
          data: participant,
          cachedAt: Date.now(),
        },
        this.participantTtl,
      );
    } catch (cacheError) {
      this.logger.warn(
        `Cache write failed for ${cacheKey}: ${cacheError.message}`,
      );
    }

    return participant;
  }

  async update(
    id: string,
    updateParticipantDto: UpdateParticipantDto,
  ): Promise<ParticipantDocument> {
    this.logger.log(`Updating participant: ${id}`);

    // Get existing participant for cache invalidation
    const existingParticipant = await this.participantRepository.findById(id);
    if (!existingParticipant) {
      throw new EntityNotFoundException('Participant', id);
    }

    // Check for email uniqueness if email is being updated
    if (updateParticipantDto.email) {
      const existing = await this.participantRepository.findByEmail(
        updateParticipantDto.email,
      );
      if (existing && existing._id.toString() !== id) {
        throw new EntityExistsException(
          'Participant',
          'email',
          updateParticipantDto.email,
        );
      }
    }

    const participant = await this.participantRepository.updateById(
      id,
      updateParticipantDto,
    );

    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }

    // Invalidate old cache entries (using old data in case email changed)
    await this.invalidateParticipantCache(existingParticipant);

    this.logger.log(`Participant updated: ${id}`);
    return participant;
  }

  async remove(id: string): Promise<ParticipantDocument> {
    this.logger.log(`Deleting participant: ${id}`);

    const participant = await this.participantRepository.deleteById(id);

    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }

    // Remove participant from all ambassador referral lists
    await this.participantRepository.removeParticipantFromAllReferrals(id);
    this.logger.log(
      `Removed participant ${id} from all ambassador referral lists`,
    );

    // Recalculate points for all ambassadors who had this participant as referral
    const ambassadors = await this.participantRepository.findByStatus(
      ParticipantStatus.AMBASSADOR,
    );
    for (const ambassador of ambassadors) {
      if (
        ambassador.referredParticipantIds.some(
          (refId) => refId.toString() === id,
        )
      ) {
        await this.calculateAmbassadorPoints(ambassador._id.toString());
      }
    }

    // Invalidate cache entries
    await this.invalidateParticipantCache(participant);

    this.logger.log(`Participant deleted: ${id}`);
    return participant;
  }

  async generateQrCode(): Promise<{ qrCode: string; qrCodeDataUrl: string }> {
    const qrCode = await this.generateUniqueQrCode();
    const qrCodeDataUrl = await QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    return { qrCode, qrCodeDataUrl };
  }

  private async generateUniqueQrCode(): Promise<string> {
    let qrCode = '';
    let isUnique = false;

    while (!isUnique) {
      qrCode = `QR-${uuidv4().substring(0, 12).toUpperCase()}`;
      const existing = await this.participantRepository.findByQrCode(qrCode);
      isUnique = !existing;
    }

    return qrCode;
  }

  async getQrCodeDataUrl(qrCode: string): Promise<string> {
    return QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });
  }

  async bulkCreate(participants: BulkParticipantItemDto[]): Promise<{
    created: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    this.logger.log(`Bulk creating ${participants.length} participants`);

    let created = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const participantData of participants) {
      try {
        await this.create({
          ...participantData,
        });
        created++;
      } catch (error) {
        errors.push({
          email: participantData.email,
          error: error.message,
        });
      }
    }

    // INVALIDATE STATS CACHE after bulk operation
    // This ensures getStats() returns accurate counts after bulk imports
    if (created > 0) {
      try {
        await this.cacheManager.del(CACHE_KEYS.PARTICIPANT_STATS);
        this.logger.debug(
          `Invalidated participant stats cache after bulk create (${created} created)`,
        );
      } catch (cacheError) {
        this.logger.warn(
          `Failed to invalidate stats cache: ${cacheError.message}`,
        );
      }
    }

    return {
      created,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Get participant statistics with Redis caching and singleflight pattern
   * Prevents cache stampede when multiple requests hit expired cache simultaneously
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    ambassadors: number;
    travelGrant: number;
  }> {
    const cacheKey = CACHE_KEYS.PARTICIPANT_STATS;

    // Try cache first with error handling
    try {
      const cached = await this.cacheManager.get<{
        total: number;
        active: number;
        ambassadors: number;
        travelGrant: number;
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache HIT for participant stats');
        return cached;
      }
    } catch (error) {
      this.logger.warn(
        `Cache read failed for participant stats: ${error.message}`,
      );
    }

    // Use singleflight to prevent stampede
    return this.withSingleflight(cacheKey, async () => {
      // Double-check cache after acquiring "lock"
      try {
        const cachedAgain = await this.cacheManager.get<{
          total: number;
          active: number;
          ambassadors: number;
          travelGrant: number;
        }>(cacheKey);

        if (cachedAgain) {
          return cachedAgain;
        }
      } catch (error) {
        this.logger.warn(
          `Cache re-read failed for participant stats: ${error.message}`,
        );
      }

      // Cache miss - fetch from database
      const stats = await this.participantRepository.getParticipantStats();

      // Cache with error handling
      try {
        await this.cacheManager.set(cacheKey, stats, this.statsTtl);
      } catch (cacheError) {
        this.logger.warn(
          `Cache write failed for participant stats: ${cacheError.message}`,
        );
      }

      return stats;
    });
  }

  /**
   * Get ambassador leaderboard with Redis caching and singleflight pattern
   * Great candidate for Redis Sorted Set in future optimization
   */
  async getAmbassadorLeaderboard(limit = 10): Promise<ParticipantDocument[]> {
    const cacheKey = `${CACHE_KEYS.AMBASSADOR_LEADERBOARD}:${limit}`;

    // Try cache first with error handling
    try {
      const cached =
        await this.cacheManager.get<ParticipantDocument[]>(cacheKey);
      if (cached) {
        this.logger.debug('Cache HIT for ambassador leaderboard');
        return cached;
      }
    } catch (error) {
      this.logger.warn(
        `Cache read failed for ambassador leaderboard: ${error.message}`,
      );
    }

    // Use singleflight to prevent stampede
    return this.withSingleflight(cacheKey, async () => {
      // Double-check cache after acquiring "lock"
      try {
        const cachedAgain =
          await this.cacheManager.get<ParticipantDocument[]>(cacheKey);
        if (cachedAgain) {
          return cachedAgain;
        }
      } catch (error) {
        this.logger.warn(
          `Cache re-read failed for ambassador leaderboard: ${error.message}`,
        );
      }

      // Cache miss - fetch from database
      const leaderboard =
        await this.participantRepository.getAmbassadorLeaderboard(limit);

      // Cache with error handling
      try {
        await this.cacheManager.set(cacheKey, leaderboard, this.statsTtl);
      } catch (cacheError) {
        this.logger.warn(
          `Cache write failed for ambassador leaderboard: ${cacheError.message}`,
        );
      }

      return leaderboard;
    });
  }

  async getAmbassadorActivity(id: string): Promise<{
    participant: ParticipantDocument;
    referredParticipants: ParticipantDocument[];
    totalPoints: number;
  }> {
    const participant = await this.findOne(id);

    if (participant.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    const referredParticipants = await this.participantRepository.findByIds(
      participant.referredParticipantIds.map((id) => id.toString()),
    );

    return {
      participant,
      referredParticipants,
      totalPoints: participant.ambassadorPoints,
    };
  }

  async calculateAmbassadorPoints(id: string): Promise<ParticipantDocument> {
    // Invalidate cache first to ensure we get fresh data
    try {
      await this.cacheManager.del(`${CACHE_KEYS.PARTICIPANT_BY_ID}${id}`);
    } catch (error) {
      this.logger.warn(
        `Cache invalidation failed for participant ${id}: ${error.message}`,
      );
    }

    // Fetch fresh data from database
    const participant = await this.participantRepository.findById(id);

    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }

    if (participant.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    // Points calculation: 10 points per referred participant
    const points = participant.referredParticipantIds.length * 10;

    const updated = await this.participantRepository.updateAmbassadorPoints(
      id,
      points,
    );
    if (!updated) {
      throw new EntityNotFoundException('Participant', id);
    }

    // Invalidate cache again after update
    try {
      await this.cacheManager.del(`${CACHE_KEYS.PARTICIPANT_BY_ID}${id}`);
    } catch (error) {
      this.logger.warn(
        `Cache invalidation failed for participant ${id}: ${error.message}`,
      );
    }

    return updated;
  }

  async addReferredParticipant(
    ambassadorId: string,
    participantId: string,
  ): Promise<ParticipantDocument> {
    // Invalidate cache first
    try {
      await this.cacheManager.del(
        `${CACHE_KEYS.PARTICIPANT_BY_ID}${ambassadorId}`,
      );
    } catch (error) {
      this.logger.warn(`Cache invalidation failed: ${error.message}`);
    }

    const ambassador = await this.participantRepository.findById(ambassadorId);

    if (!ambassador) {
      throw new EntityNotFoundException('Ambassador', ambassadorId);
    }

    if (ambassador.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    // Verify referred participant exists
    const participant =
      await this.participantRepository.findById(participantId);
    if (!participant) {
      throw new EntityNotFoundException('Participant', participantId);
    }

    const updated = await this.participantRepository.addReferredParticipant(
      ambassadorId,
      participantId,
    );

    if (!updated) {
      throw new EntityNotFoundException('Ambassador', ambassadorId);
    }

    // Recalculate points and return the final updated document
    return this.calculateAmbassadorPoints(ambassadorId);
  }

  async removeReferredParticipant(
    ambassadorId: string,
    participantId: string,
  ): Promise<ParticipantDocument> {
    // Invalidate cache first
    try {
      await this.cacheManager.del(
        `${CACHE_KEYS.PARTICIPANT_BY_ID}${ambassadorId}`,
      );
    } catch (error) {
      this.logger.warn(`Cache invalidation failed: ${error.message}`);
    }

    const updated = await this.participantRepository.removeReferredParticipant(
      ambassadorId,
      participantId,
    );

    if (!updated) {
      throw new EntityNotFoundException('Ambassador', ambassadorId);
    }

    // Recalculate points and return the final updated document
    return this.calculateAmbassadorPoints(ambassadorId);
  }

  /**
   * Auto-sync referrals for an ambassador based on organization
   * Finds all participants (regular + travel grant) with the same organization
   * and adds them as referrals
   */
  async syncOrganizationReferrals(ambassadorId: string): Promise<{
    ambassador: ParticipantDocument;
    addedCount: number;
    totalReferrals: number;
  }> {
    // Invalidate cache first
    try {
      await this.cacheManager.del(
        `${CACHE_KEYS.PARTICIPANT_BY_ID}${ambassadorId}`,
      );
    } catch (error) {
      this.logger.warn(`Cache invalidation failed: ${error.message}`);
    }

    const ambassador = await this.participantRepository.findById(ambassadorId);

    if (!ambassador) {
      throw new EntityNotFoundException('Ambassador', ambassadorId);
    }

    if (ambassador.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    if (!ambassador.organization) {
      throw new ValidationException([
        {
          field: 'organization',
          message: 'Ambassador has no organization set',
        },
      ]);
    }

    // Find all participants with the same organization (excluding the ambassador)
    const organizationMembers =
      await this.participantRepository.findOrganizationMembers(
        ambassador.organization,
        ambassadorId,
      );

    // Get current referral IDs for comparison
    const currentReferralIds = ambassador.referredParticipantIds.map((id) =>
      id.toString(),
    );
    const newMemberIds = organizationMembers.map((m) => m._id.toString());

    // Merge current referrals with organization members (preserving manually added ones)
    const mergedReferralIds = [
      ...new Set([...currentReferralIds, ...newMemberIds]),
    ];

    // Calculate how many new referrals were added
    const addedCount = mergedReferralIds.length - currentReferralIds.length;

    // Update the ambassador's referral list
    await this.participantRepository.setReferredParticipants(
      ambassadorId,
      mergedReferralIds,
    );

    // Recalculate points and get the final updated document
    const finalAmbassador = await this.calculateAmbassadorPoints(ambassadorId);

    this.logger.log(
      `Synced organization referrals for ambassador ${ambassadorId}: ` +
        `added ${addedCount} new referrals, total ${mergedReferralIds.length}`,
    );

    return {
      ambassador: finalAmbassador,
      addedCount,
      totalReferrals: mergedReferralIds.length,
    };
  }

  /**
   * Sync referrals for all ambassadors based on their organizations
   */
  async syncAllAmbassadorReferrals(): Promise<{
    processed: number;
    totalAdded: number;
  }> {
    const ambassadors = await this.participantRepository.findByStatus(
      ParticipantStatus.AMBASSADOR,
    );

    let totalAdded = 0;
    for (const ambassador of ambassadors) {
      if (ambassador.organization) {
        try {
          const result = await this.syncOrganizationReferrals(
            ambassador._id.toString(),
          );
          totalAdded += result.addedCount;
        } catch (error) {
          this.logger.warn(
            `Failed to sync referrals for ambassador ${ambassador._id}: ${error.message}`,
          );
        }
      }
    }

    return {
      processed: ambassadors.length,
      totalAdded,
    };
  }

  // Travel grant methods
  async getTravelGrantApplications(
    status?: boolean,
    organization?: string,
  ): Promise<ParticipantDocument[]> {
    return this.participantRepository.getTravelGrantApplications(
      status,
      organization,
    );
  }

  async getTravelGrantStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return this.participantRepository.getTravelGrantStats();
  }

  async checkTravelGrantQualification(id: string): Promise<{
    qualified: boolean;
    reason?: string;
  }> {
    const participant = await this.findOne(id);

    // Example qualification logic - can be customized
    if (participant.travelGrantApplied) {
      return {
        qualified: false,
        reason: 'Already applied for travel grant',
      };
    }

    if (!participant.organization) {
      return {
        qualified: false,
        reason: 'Organization information required',
      };
    }

    return { qualified: true };
  }

  async applyForTravelGrant(id: string): Promise<ParticipantDocument> {
    const qualification = await this.checkTravelGrantQualification(id);

    if (!qualification.qualified) {
      throw new ValidationException([
        {
          field: 'travelGrant',
          message: qualification.reason || 'Not qualified for travel grant',
        },
      ]);
    }

    const updated = await this.participantRepository.updateById(id, {
      travelGrantApplied: true,
      travelGrantAppliedAt: new Date(),
      status: ParticipantStatus.TRAVEL_GRANT,
    });

    if (!updated) {
      throw new EntityNotFoundException('Participant', id);
    }

    return updated;
  }

  async decideTravelGrant(
    id: string,
    approved: boolean,
  ): Promise<ParticipantDocument> {
    const participant = await this.findOne(id);

    // Check if participant is a travel grant applicant (either by flag or status)
    const isTravelGrantApplicant =
      participant.travelGrantApplied ||
      participant.status === ParticipantStatus.TRAVEL_GRANT;

    if (!isTravelGrantApplicant) {
      throw new ValidationException([
        { field: 'travelGrant', message: 'No travel grant application found' },
      ]);
    }

    const updated = await this.participantRepository.updateById(id, {
      travelGrantApplied: true, // Ensure this is set
      travelGrantApproved: approved,
      travelGrantDecidedAt: new Date(),
    });

    if (!updated) {
      throw new EntityNotFoundException('Participant', id);
    }

    return updated;
  }

  async findByIds(ids: string[]): Promise<ParticipantDocument[]> {
    return this.participantRepository.findByIds(ids);
  }

  async findByOrganization(
    organization: string,
  ): Promise<ParticipantDocument[]> {
    return this.participantRepository.findByOrganization(organization);
  }

  async searchAmbassadors(
    search?: string,
    sortBy: string = 'ambassadorPoints',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 10,
  ) {
    return this.participantRepository.searchAmbassadors(
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    );
  }

  async searchTravelGrants(
    search?: string,
    status?: 'pending' | 'approved' | 'rejected',
    sortBy: string = 'travelGrantAppliedAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 10,
  ) {
    return this.participantRepository.searchTravelGrants(
      search,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
    );
  }

  async getAmbassadorDetails(id: string) {
    const ambassador = await this.findOne(id);

    if (ambassador.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    const referredIds = ambassador.referredParticipantIds.map((id) =>
      id.toString(),
    );
    const referredParticipants =
      referredIds.length > 0 ? await this.findByIds(referredIds) : [];

    return {
      ambassador,
      referredParticipants,
      stats: {
        totalReferrals: referredParticipants.length,
        activeReferrals: referredParticipants.filter((p) => p.isActive).length,
        points: ambassador.ambassadorPoints,
      },
    };
  }

  async getTravelGrantDetails(id: string) {
    const participant = await this.findOne(id);

    // Get check-ins for this participant with session details
    const checkIns = await this.checkInsService.findByParticipant(id);

    // Get registrations for this participant to calculate total registered sessions
    const registrations = await this.registrationsService.findByParticipant(id);
    const confirmedRegistrations = registrations.filter(
      (r) => r.status === 'confirmed',
    );

    // Format last check-ins with session info and timestamps
    const lastCheckIns = checkIns.slice(0, 10).map((checkIn) => ({
      _id: checkIn._id,
      sessionId: checkIn.sessionId,
      sessionName: (checkIn.sessionId as any)?.name || 'Unknown Session',
      sessionLocation: (checkIn.sessionId as any)?.location || '',
      checkInTime: checkIn.checkInTime,
      method: checkIn.method,
      isLate: checkIn.isLate,
    }));

    return {
      participant,
      checkInProgress: {
        completed: checkIns.length,
        total: confirmedRegistrations.length,
        percentage:
          confirmedRegistrations.length > 0
            ? Math.round(
                (checkIns.length / confirmedRegistrations.length) * 100,
              )
            : 0,
      },
      lastCheckIns,
      stats: {
        totalCheckIns: checkIns.length,
        totalRegisteredSessions: confirmedRegistrations.length,
        applicationStatus:
          participant.travelGrantApproved === null
            ? 'pending'
            : participant.travelGrantApproved
              ? 'approved'
              : 'rejected',
        appliedAt: participant.travelGrantAppliedAt,
        decidedAt: participant.travelGrantDecidedAt,
      },
    };
  }

  async promoteToAmbassador(id: string): Promise<ParticipantDocument> {
    const participant = await this.findOne(id);

    if (participant.status === ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is already an ambassador' },
      ]);
    }

    const updated = await this.participantRepository.updateById(id, {
      status: ParticipantStatus.AMBASSADOR,
      ambassadorPoints: 0,
    });

    if (!updated) {
      throw new EntityNotFoundException('Participant', id);
    }

    return updated;
  }

  async demoteFromAmbassador(id: string): Promise<ParticipantDocument> {
    const participant = await this.findOne(id);

    if (participant.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    const updated = await this.participantRepository.updateById(id, {
      status: ParticipantStatus.REGULAR,
      ambassadorPoints: 0,
      referredParticipantIds: [],
    });

    if (!updated) {
      throw new EntityNotFoundException('Participant', id);
    }

    return updated;
  }

  async getAllAmbassadors(): Promise<ParticipantDocument[]> {
    return this.participantRepository.findByStatus(
      ParticipantStatus.AMBASSADOR,
    );
  }

  async getAllTravelGrants(): Promise<ParticipantDocument[]> {
    return this.participantRepository.findAllTravelGrantApplicants();
  }
}
