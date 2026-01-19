import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionRepository } from '../repositories';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionFilterDto,
  AssignParticipantsDto,
  BulkCreateSessionsDto,
  BulkCreateResult,
} from '../dto';
import { SessionDocument, SessionStatus } from '../schemas';
import {
  EntityNotFoundException,
  ValidationException,
} from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';
import { SessionSchedulerService } from './session-scheduler.service';
import { REDIS_CLIENT } from '../../../common/redis';
import type { RedisClientType } from 'redis';
import { PinoLoggerService, getCurrentRequestId } from '../../../common/logger';

// Environment-prefixed cache keys to prevent collisions across environments
const ENV_PREFIX = process.env.NODE_ENV || 'development';
const APP_PREFIX = process.env.REDIS_KEY_PREFIX || 'checkin';

const CACHE_KEYS = {
  SESSION_BY_ID: `${APP_PREFIX}:${ENV_PREFIX}:session:byId:`,
  SESSION_STATS: `${APP_PREFIX}:${ENV_PREFIX}:session:stats`,
  SESSION_CAPACITY: `${APP_PREFIX}:${ENV_PREFIX}:session:capacity:`,
  CAPACITY_STATUS: `${APP_PREFIX}:${ENV_PREFIX}:session:capacityStatus:`,
} as const;

// TTL for capacity status cache (5 seconds for hot path optimization)
const CAPACITY_STATUS_TTL = 5000;

/**
 * Lua script for atomic capacity check-and-increment
 * Prevents TOCTOU race conditions by executing check and increment atomically
 * Returns: new count on success, -1 if at capacity
 */
const INCREMENT_WITH_CAP_SCRIPT = `
  local current = tonumber(redis.call('GET', KEYS[1]) or '0')
  local capacity = tonumber(ARGV[1])
  if current >= capacity then
    return -1
  end
  return redis.call('INCR', KEYS[1])
`;

/**
 * Lua script for atomic decrement (release slot)
 * Used to rollback a reservation if check-in creation fails
 * Returns: new count after decrement (minimum 0)
 */
const DECREMENT_SCRIPT = `
  local current = tonumber(redis.call('GET', KEYS[1]) or '0')
  if current <= 0 then
    return 0
  end
  return redis.call('DECR', KEYS[1])
`;

/**
 * Result of a capacity reservation attempt
 * Used by check-in flow for reserve-before-write pattern
 */
export interface CapacityReservation {
  success: boolean;
  capacity: number;
  checkInsCount: number;
  remaining: number;
  percentFull: number;
  isNearCapacity: boolean;
}

/**
 * Cache wrapper interface for sentinel pattern
 * Distinguishes between cached null values and cache misses
 */
interface CacheWrapper<T> {
  data: T;
  cachedAt: number;
}

@Injectable()
export class SessionsService implements OnModuleInit {
  private readonly logger: PinoLoggerService;
  private readonly sessionTtl: number;
  private readonly statsTtl: number;
  private readonly capacityTtl: number;

  // Singleflight pattern: track in-flight requests to prevent cache stampede
  private readonly pendingRequests = new Map<string, Promise<any>>();

  constructor(
    private readonly sessionRepository: SessionRepository,
    @Inject(forwardRef(() => SessionSchedulerService))
    private readonly sessionSchedulerService: SessionSchedulerService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SessionsService.name);
    this.sessionTtl = this.configService.get<number>(
      'redis.cache.sessionTtl',
      60000,
    );
    this.statsTtl = this.configService.get<number>(
      'redis.cache.statsTtl',
      30000,
    );
    this.capacityTtl = this.configService.get<number>(
      'redis.cache.capacityTtl',
      5000,
    );
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('SessionsService initialized with Redis caching');
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
      this.logger.debug('Singleflight: coalescing request', {
        key,
        reqId: getCurrentRequestId(),
      });
      return pending as Promise<T>;
    }

    const promise = factory().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Check if Redis client is available and connected
   * Handles both real Redis client and NullRedisClient fallback
   */
  private isRedisAvailable(): boolean {
    if (!this.redisClient) return false;
    // Check for NullRedisClient (fallback)
    if ((this.redisClient as any).isNull) return false;
    // Check if real client is connected
    return (this.redisClient as any).isOpen === true;
  }

  /**
   * Invalidate all cache entries for a session
   * Wrapped in try-catch to prevent cache failures from breaking operations
   * IMMEDIATELY invalidates after DB write to prevent stale reads
   */
  private async invalidateSessionCache(sessionId: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(`${CACHE_KEYS.SESSION_BY_ID}${sessionId}`),
        this.cacheManager.del(CACHE_KEYS.SESSION_STATS),
        this.cacheManager.del(`${CACHE_KEYS.CAPACITY_STATUS}${sessionId}`),
      ]);
    } catch (error) {
      this.logger.warn('Cache invalidation failed', {
        sessionId,
        error: error.message,
        reqId: getCurrentRequestId(),
      });
      // Continue - cache invalidation failure should not break the operation
    }
  }

  async create(createSessionDto: CreateSessionDto): Promise<SessionDocument> {
    this.logger.log('Creating session', {
      name: createSessionDto.name,
      reqId: getCurrentRequestId(),
    });

    // Validate dates
    const startTime = new Date(createSessionDto.startTime);
    const endTime = new Date(createSessionDto.endTime);

    if (endTime <= startTime) {
      throw new ValidationException([
        { field: 'endTime', message: 'End time must be after start time' },
      ]);
    }

    // Determine initial status based on isOpen flag
    const status = createSessionDto.isOpen
      ? SessionStatus.OPEN
      : SessionStatus.SCHEDULED;

    const session = await this.sessionRepository.create({
      ...createSessionDto,
      startTime,
      endTime,
      status,
    });

    this.logger.log('Session created', {
      sessionId: session._id,
      name: createSessionDto.name,
      reqId: getCurrentRequestId(),
    });
    return session;
  }

  async findAll(
    filterDto: SessionFilterDto,
  ): Promise<PaginatedResult<SessionDocument>> {
    this.logger.debug('Finding sessions with filters', {
      filters: filterDto,
      reqId: getCurrentRequestId(),
    });
    return this.sessionRepository.findWithFilters(filterDto);
  }

  /**
   * Find session by ID with Redis caching using sentinel pattern
   * Properly distinguishes between cache miss and cached null values
   */
  async findOne(id: string): Promise<SessionDocument> {
    const cacheKey = `${CACHE_KEYS.SESSION_BY_ID}${id}`;

    try {
      // Try cache first with sentinel pattern
      const cached =
        await this.cacheManager.get<CacheWrapper<SessionDocument | null>>(
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
          throw new EntityNotFoundException('Session', id);
        }
        this.logger.debug('Cache HIT for session', {
          sessionId: id,
          reqId: getCurrentRequestId(),
        });
        return cached.data;
      }
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.warn('Cache read failed', {
        cacheKey,
        error: error.message,
        reqId: getCurrentRequestId(),
      });
    }

    // Cache miss - fetch from database
    this.logger.debug('Cache MISS for session', {
      sessionId: id,
      reqId: getCurrentRequestId(),
    });
    const session = await this.sessionRepository.findById(id);

    // Cache with wrapper (including null results to prevent repeated DB lookups)
    // Wrapped in try-catch to prevent cache write failures from crashing requests
    try {
      await this.cacheManager.set(
        cacheKey,
        {
          data: session,
          cachedAt: Date.now(),
        },
        this.sessionTtl,
      );
    } catch (cacheError) {
      this.logger.warn('Cache write failed', {
        cacheKey,
        error: cacheError.message,
        reqId: getCurrentRequestId(),
      });
      // Continue - cache write failure should not fail the request
    }

    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    return session;
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<SessionDocument> {
    this.logger.debug('Updating session', {
      sessionId: id,
      reqId: getCurrentRequestId(),
    });

    // Get previous session state for comparison
    const previousSession = await this.sessionRepository.findById(id);
    if (!previousSession) {
      throw new EntityNotFoundException('Session', id);
    }

    // Validate dates if both are provided
    if (updateSessionDto.startTime && updateSessionDto.endTime) {
      const startTime = new Date(updateSessionDto.startTime);
      const endTime = new Date(updateSessionDto.endTime);

      if (endTime <= startTime) {
        throw new ValidationException([
          { field: 'endTime', message: 'End time must be after start time' },
        ]);
      }
    }

    const updateData: Record<string, any> = {};

    if (updateSessionDto.name !== undefined)
      updateData.name = updateSessionDto.name;
    if (updateSessionDto.description !== undefined)
      updateData.description = updateSessionDto.description;
    if (updateSessionDto.location !== undefined)
      updateData.location = updateSessionDto.location;
    if (updateSessionDto.capacity !== undefined)
      updateData.capacity = updateSessionDto.capacity;
    if (updateSessionDto.startTime)
      updateData.startTime = new Date(updateSessionDto.startTime);
    if (updateSessionDto.endTime)
      updateData.endTime = new Date(updateSessionDto.endTime);

    // Track if status is being manually changed
    let isStatusChange = false;
    let newStatus: SessionStatus | undefined;
    let newIsOpen: boolean | undefined;
    const previousStatus = previousSession.status;
    const previousIsOpen = previousSession.isOpen;

    // Sync isOpen and status fields
    if (updateSessionDto.isOpen !== undefined) {
      updateData.isOpen = updateSessionDto.isOpen;
      newIsOpen = updateSessionDto.isOpen;

      // When manually changing isOpen, update status accordingly
      if (updateSessionDto.isOpen) {
        updateData.status = SessionStatus.OPEN;
        newStatus = SessionStatus.OPEN;
      } else {
        // When closing: if session hasn't ended yet, set to SCHEDULED so it can auto-open
        // If session has ended, set to CLOSED
        const endTime = updateSessionDto.endTime
          ? new Date(updateSessionDto.endTime)
          : previousSession.endTime;
        const now = new Date();

        if (endTime > now) {
          // Session hasn't ended - can be auto-opened later
          updateData.status = SessionStatus.SCHEDULED;
          newStatus = SessionStatus.SCHEDULED;
        } else {
          // Session has ended - mark as closed
          updateData.status = SessionStatus.CLOSED;
          newStatus = SessionStatus.CLOSED;
        }
      }

      isStatusChange = previousSession.isOpen !== updateSessionDto.isOpen;
    }

    const session = await this.sessionRepository.updateById(id, updateData);

    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    // Invalidate cache after update
    await this.invalidateSessionCache(id);

    // Emit real-time update if status changed
    if (isStatusChange && newStatus !== undefined && newIsOpen !== undefined) {
      await this.sessionSchedulerService.manualStatusUpdate(
        id,
        newStatus,
        newIsOpen,
        previousStatus,
        previousIsOpen,
      );
    }

    this.logger.log('Session updated', {
      sessionId: id,
      reqId: getCurrentRequestId(),
    });
    return session;
  }

  async remove(id: string): Promise<SessionDocument> {
    this.logger.debug('Deleting session', {
      sessionId: id,
      reqId: getCurrentRequestId(),
    });

    const session = await this.sessionRepository.deleteById(id);

    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    // Invalidate cache after delete
    await this.invalidateSessionCache(id);

    // Also delete capacity counter (with error handling)
    if (this.isRedisAvailable()) {
      try {
        await this.redisClient.del(`${CACHE_KEYS.SESSION_CAPACITY}${id}`);
      } catch (error) {
        this.logger.warn('Failed to delete capacity key', {
          sessionId: id,
          error: error.message,
          reqId: getCurrentRequestId(),
        });
        // Continue - key will expire via TTL
      }
    }

    this.logger.log('Session deleted', {
      sessionId: id,
      reqId: getCurrentRequestId(),
    });
    return session;
  }

  async toggleOpen(id: string, isOpen: boolean): Promise<SessionDocument> {
    this.logger.debug('Toggling session open status', {
      sessionId: id,
      isOpen,
      reqId: getCurrentRequestId(),
    });

    const session = await this.sessionRepository.updateById(id, { isOpen });

    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    return session;
  }

  async getUpcoming(limit = 5): Promise<SessionDocument[]> {
    return this.sessionRepository.findUpcoming(limit);
  }

  /**
   * Get session statistics with Redis caching and singleflight pattern
   * Prevents cache stampede when multiple requests hit expired cache simultaneously
   */
  async getStats(): Promise<{
    total: number;
    open: number;
    upcoming: number;
    past: number;
  }> {
    const cacheKey = CACHE_KEYS.SESSION_STATS;

    // Try cache first with error handling
    try {
      const cached = await this.cacheManager.get<{
        total: number;
        open: number;
        upcoming: number;
        past: number;
      }>(cacheKey);

      if (cached) {
        this.logger.debug('Cache HIT for session stats', {
          reqId: getCurrentRequestId(),
        });
        return cached;
      }
    } catch (error) {
      this.logger.warn('Cache read failed for stats', {
        error: error.message,
        reqId: getCurrentRequestId(),
      });
    }

    // Use singleflight to prevent stampede
    return this.withSingleflight(cacheKey, async () => {
      // Double-check cache after acquiring "lock"
      try {
        const cachedAgain = await this.cacheManager.get<{
          total: number;
          open: number;
          upcoming: number;
          past: number;
        }>(cacheKey);

        if (cachedAgain) {
          return cachedAgain;
        }
      } catch (error) {
        this.logger.warn('Cache re-read failed for stats', {
          error: error.message,
          reqId: getCurrentRequestId(),
        });
      }

      // Cache miss - fetch from database
      const stats = await this.sessionRepository.getSessionStats();

      // Cache the result with error handling
      try {
        await this.cacheManager.set(cacheKey, stats, this.statsTtl);
      } catch (cacheError) {
        this.logger.warn('Cache write failed for stats', {
          error: cacheError.message,
          reqId: getCurrentRequestId(),
        });
      }

      return stats;
    });
  }

  async incrementCheckInCount(sessionId: string): Promise<void> {
    await this.sessionRepository.incrementCheckInCount(sessionId);
    // Invalidate cache since count changed
    await this.invalidateSessionCache(sessionId);
  }

  /**
   * RESERVE a capacity slot BEFORE creating check-in (atomic)
   *
   * This is the FIRST step in the reserve-before-write pattern:
   * 1. Reserve slot atomically (this method)
   * 2. Create check-in record in MongoDB
   * 3. On failure: release slot via releaseCapacitySlot()
   *
   * WRITE-THROUGH PATTERN:
   * - MongoDB is ALWAYS written first (source of truth)
   * - Redis is updated after (cache for fast reads)
   *
   * @returns CapacityReservation with success status and capacity info
   */
  async reserveCapacitySlot(sessionId: string): Promise<CapacityReservation> {
    // Get session to check capacity limit
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return {
        success: false,
        capacity: 0,
        checkInsCount: 0,
        remaining: 0,
        percentFull: 0,
        isNearCapacity: false,
      };
    }

    const capacity = session.capacity || 0;

    // If no capacity limit, always succeed without incrementing
    if (capacity === 0) {
      return {
        success: true,
        capacity: 0,
        checkInsCount: session.checkInsCount,
        remaining: -1, // Unlimited
        percentFull: 0,
        isNearCapacity: false,
      };
    }

    // WRITE-THROUGH: MongoDB FIRST (source of truth)
    // Use atomic increment with capacity check
    const result =
      await this.sessionRepository.incrementCheckInCountWithCapacity(sessionId);

    if (!result) {
      // At capacity - MongoDB rejected the increment
      this.logger.warn('Session at capacity', {
        sessionId,
        capacity,
        reqId: getCurrentRequestId(),
      });
      return {
        success: false,
        capacity,
        checkInsCount: session.checkInsCount,
        remaining: 0,
        percentFull: 100,
        isNearCapacity: true,
      };
    }

    const newCount = result.checkInsCount;
    this.logger.debug('Session slot reserved', {
      sessionId,
      count: newCount,
      capacity,
      reqId: getCurrentRequestId(),
    });

    // WRITE-THROUGH: Then update Redis (cache)
    if (this.isRedisAvailable()) {
      try {
        const capacityKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
        await this.redisClient.set(capacityKey, newCount.toString());
        await this.redisClient.expire(capacityKey, 3600); // 1 hour TTL
      } catch (error) {
        this.logger.warn('Failed to sync Redis counter', {
          sessionId,
          error: error.message,
          reqId: getCurrentRequestId(),
        });
        // Continue - MongoDB is authoritative
      }
    }

    // Invalidate session cache
    await this.invalidateSessionCache(sessionId);

    const remaining = Math.max(0, capacity - newCount);
    const percentFull = Math.round((newCount / capacity) * 100);

    return {
      success: true,
      capacity,
      checkInsCount: newCount,
      remaining,
      percentFull,
      isNearCapacity: percentFull >= 80,
    };
  }

  /**
   * RELEASE a capacity slot on check-in creation failure
   *
   * This is the rollback step when check-in creation fails after reservation.
   *
   * WRITE-THROUGH PATTERN:
   * - MongoDB is ALWAYS written first (source of truth)
   * - Redis is updated after (cache)
   */
  async releaseCapacitySlot(sessionId: string): Promise<void> {
    this.logger.debug(`Releasing capacity slot for session ${sessionId}`);

    // WRITE-THROUGH: MongoDB FIRST (source of truth)
    await this.sessionRepository.decrementCheckInCount(sessionId);

    // WRITE-THROUGH: Then update Redis (cache)
    if (this.isRedisAvailable()) {
      try {
        const capacityKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
        const exists = await this.redisClient.exists(capacityKey);
        if (exists) {
          await this.redisClient.eval(DECREMENT_SCRIPT, {
            keys: [capacityKey],
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to release Redis slot: ${error.message}`);
        // Continue - MongoDB is authoritative
      }
    }

    // Invalidate session cache
    await this.invalidateSessionCache(sessionId);
  }

  /**
   * INCREMENT check-in count with capacity check (WRITE-THROUGH)
   *
   * This method uses write-through pattern:
   * - MongoDB is ALWAYS the source of truth
   * - Redis is updated AFTER MongoDB for fast reads
   *
   * NOTE: For new check-ins, prefer reserveCapacitySlot() which uses
   * reserve-before-write pattern for better race condition handling.
   *
   * @returns Updated session if successful, null if at capacity
   */
  async incrementCheckInCountWithCapacity(
    sessionId: string,
  ): Promise<SessionDocument | null> {
    // Get session to check capacity limit
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    // If no capacity limit, use traditional DB increment
    if (!session.capacity || session.capacity === 0) {
      const result =
        await this.sessionRepository.incrementCheckInCountWithCapacity(
          sessionId,
        );
      if (result) {
        await this.invalidateSessionCache(sessionId);
      }
      return result;
    }

    // WRITE-THROUGH: MongoDB FIRST (source of truth)
    const result =
      await this.sessionRepository.incrementCheckInCountWithCapacity(sessionId);

    if (!result) {
      // At capacity - MongoDB rejected the increment
      this.logger.warn(
        `Session ${sessionId} at capacity (${session.capacity})`,
      );
      return null;
    }

    const newCount = result.checkInsCount;
    this.logger.debug(
      `Session ${sessionId} check-in count incremented to ${newCount}/${session.capacity}`,
    );

    // WRITE-THROUGH: Then update Redis (cache)
    if (this.isRedisAvailable()) {
      try {
        const capacityKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
        await this.redisClient.set(capacityKey, newCount.toString());
        await this.redisClient.expire(capacityKey, 3600); // 1 hour TTL
      } catch (error) {
        this.logger.warn(`Failed to sync Redis counter: ${error.message}`);
        // Continue - MongoDB is authoritative
      }
    }

    // Invalidate session cache
    await this.invalidateSessionCache(sessionId);

    return result;
  }

  /**
   * Background job: Reconcile Redis capacity counters with MongoDB
   * Runs every 30 seconds to ensure consistency
   * Gracefully handles Redis unavailability
   *
   * PERFORMANCE: Uses SCAN iterator instead of KEYS to avoid blocking Redis
   * PERFORMANCE: Uses MGET for batch reads instead of sequential GET
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncCapacityCounters(): Promise<void> {
    // Skip if Redis is not available
    if (!this.isRedisAvailable()) {
      this.logger.debug('Skipping capacity sync - Redis unavailable');
      return;
    }

    try {
      const pattern = `${CACHE_KEYS.SESSION_CAPACITY}*`;
      const keys: string[] = [];

      // Use SCAN iterator instead of KEYS (non-blocking, O(1) per iteration)
      try {
        for await (const key of this.redisClient.scanIterator({
          MATCH: pattern,
          COUNT: 100, // Process 100 keys per SCAN iteration
        })) {
          // Handle both single key and array of keys (depends on Redis client version)
          if (Array.isArray(key)) {
            keys.push(...key);
          } else {
            keys.push(key as string);
          }
        }
      } catch (scanError) {
        // Fallback to KEYS if scanIterator not supported (e.g., older Redis)
        this.logger.debug(
          `SCAN not available, falling back to KEYS: ${scanError.message}`,
        );
        const fallbackKeys = await this.redisClient.keys(pattern);
        keys.push(...fallbackKeys);
      }

      if (keys.length === 0) {
        return; // No capacity counters to sync
      }

      // Batch read with MGET instead of sequential GET
      let values: (string | null)[];
      try {
        values = await this.redisClient.mGet(keys);
      } catch (mgetError) {
        // Fallback to sequential GET if MGET fails
        this.logger.debug(
          `MGET not available, falling back to sequential GET: ${mgetError.message}`,
        );
        values = await Promise.all(
          keys.map((key) => this.redisClient.get(key)),
        );
      }

      let syncedCount = 0;
      let failedCount = 0;

      // Process in parallel batches for better performance
      const batchSize = 10;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batchPromises = keys
          .slice(i, i + batchSize)
          .map(async (key, idx) => {
            try {
              const sessionId = key.replace(CACHE_KEYS.SESSION_CAPACITY, '');
              const redisCount = values[i + idx];

              if (redisCount) {
                const count = parseInt(redisCount, 10);
                await this.sessionRepository.reconcileCheckInCount(
                  sessionId,
                  count,
                );
                this.logger.debug(
                  `Synced capacity for session ${sessionId}: ${count}`,
                );
                return { success: true };
              }
              return { success: false };
            } catch (itemError) {
              this.logger.warn(
                `Failed to sync capacity for key ${key}: ${itemError.message}`,
              );
              return { success: false, error: true };
            }
          });

        const results = await Promise.all(batchPromises);
        syncedCount += results.filter((r) => r.success).length;
        failedCount += results.filter((r) => r.error).length;
      }

      if (syncedCount > 0 || failedCount > 0) {
        this.logger.log(
          `Capacity sync complete: ${syncedCount} synced, ${failedCount} failed`,
        );
      }
    } catch (error) {
      this.logger.error(`Capacity sync job failed: ${error.message}`);
      // Don't throw - let the cron job continue for the next iteration
    }
  }

  async decrementCheckInCount(sessionId: string): Promise<void> {
    await this.sessionRepository.decrementCheckInCount(sessionId);

    // Decrement Redis counter if Redis is available and counter exists
    if (this.isRedisAvailable()) {
      try {
        const capacityKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
        const exists = await this.redisClient.exists(capacityKey);
        if (exists) {
          await this.redisClient.decr(capacityKey);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to decrement Redis counter for session ${sessionId}: ${error.message}`,
        );
        // Continue - MongoDB is source of truth
      }
    }

    // Invalidate cache
    await this.invalidateSessionCache(sessionId);
  }

  /**
   * Get capacity status for a session including remaining slots and percentage
   *
   * HOT PATH OPTIMIZATION: Uses short TTL cache (5s) to reduce MongoDB hits
   * This is called on every QR scan during check-in
   */
  async getCapacityStatus(sessionId: string): Promise<{
    capacity: number;
    checkInsCount: number;
    remaining: number;
    percentFull: number;
    isAtCapacity: boolean;
    isNearCapacity: boolean;
    capacityEnforced: boolean;
  }> {
    const cacheKey = `${CACHE_KEYS.CAPACITY_STATUS}${sessionId}`;

    // Try cache first (short TTL for accuracy)
    try {
      const cached = await this.cacheManager.get<{
        capacity: number;
        checkInsCount: number;
        remaining: number;
        percentFull: number;
        isAtCapacity: boolean;
        isNearCapacity: boolean;
        capacityEnforced: boolean;
      }>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache HIT for capacity status: ${sessionId}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(
        `Cache read failed for capacity status: ${error.message}`,
      );
    }

    // Cache miss - fetch from database
    this.logger.debug(`Cache MISS for capacity status: ${sessionId}`);
    const status = await this.sessionRepository.getCapacityStatus(sessionId);

    // Cache with short TTL (5 seconds) for hot path optimization
    try {
      await this.cacheManager.set(cacheKey, status, CAPACITY_STATUS_TTL);
    } catch (cacheError) {
      this.logger.warn(
        `Cache write failed for capacity status: ${cacheError.message}`,
      );
    }

    return status;
  }

  /**
   * Invalidate capacity status cache for a session
   * Called after capacity changes (check-in, check-out, etc.)
   */
  private async invalidateCapacityStatusCache(
    sessionId: string,
  ): Promise<void> {
    try {
      await this.cacheManager.del(`${CACHE_KEYS.CAPACITY_STATUS}${sessionId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate capacity status cache: ${error.message}`,
      );
    }
  }

  /**
   * Reconcile checkInsCount with actual check-ins count
   * Used by background job to fix any inconsistencies
   */
  async reconcileCheckInCount(
    sessionId: string,
    actualCount: number,
  ): Promise<void> {
    this.logger.log(
      `Reconciling check-in count for session ${sessionId}: setting to ${actualCount}`,
    );
    await this.sessionRepository.reconcileCheckInCount(sessionId, actualCount);
  }

  /**
   * Bulk create multiple sessions at once
   * Returns detailed results including successes and failures
   */
  async bulkCreate(bulkDto: BulkCreateSessionsDto): Promise<BulkCreateResult> {
    this.logger.log(`Bulk creating ${bulkDto.sessions.length} sessions`);

    const result: BulkCreateResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    for (let i = 0; i < bulkDto.sessions.length; i++) {
      const sessionDto = bulkDto.sessions[i];

      try {
        // Validate dates
        const startTime = new Date(sessionDto.startTime);
        const endTime = new Date(sessionDto.endTime);

        if (endTime <= startTime) {
          result.failed++;
          result.errors.push({
            index: i,
            name: sessionDto.name,
            error: 'End time must be after start time',
          });
          continue;
        }

        const session = await this.sessionRepository.create({
          ...sessionDto,
          startTime,
          endTime,
        });

        result.success++;
        result.created.push({
          _id: session._id.toString(),
          name: session.name,
        });

        this.logger.log(`Bulk created session: ${session.name}`);
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          name: sessionDto.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.error(
          `Failed to create session ${sessionDto.name}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Bulk create completed: ${result.success} success, ${result.failed} failed`,
    );
    return result;
  }
}
