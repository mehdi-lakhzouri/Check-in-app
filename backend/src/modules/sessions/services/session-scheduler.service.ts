import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import * as Bull from 'bull';
import { Session, SessionDocument, SessionStatus } from '../schemas';
import {
  SESSION_SCHEDULER_QUEUE,
  SessionSchedulerProcessor,
} from '../processors';
import { PinoLoggerService, getCurrentRequestId } from '../../../common/logger';

/**
 * Session Status Update Result
 * Returned when a session status is changed
 */
export interface SessionStatusUpdate {
  sessionId: string;
  sessionName: string;
  previousStatus: SessionStatus;
  newStatus: SessionStatus;
  previousIsOpen: boolean;
  newIsOpen: boolean;
  reason: 'auto_open' | 'auto_end' | 'manual';
  timestamp: Date;
}

/**
 * Session Lifecycle Update Result (alias for compatibility)
 * Used by the processor for auto-open/auto-end operations
 */
export interface SessionLifecycleUpdate {
  sessionId: string;
  sessionName: string;
  previousLifecycle: SessionStatus;
  newLifecycle: SessionStatus;
  previousIsOpen: boolean;
  newIsOpen: boolean;
  reason: 'auto_open' | 'auto_end' | 'manual';
  timestamp: Date;
}

/**
 * Session Scheduler Service
 *
 * Handles automatic session status management using Bull queue:
 * - Auto-opens sessions X minutes before start time
 * - Auto-ends sessions after their end time
 * - Emits events for real-time updates via WebSocket
 *
 * Production-ready features:
 * - Distributed job processing with Redis (prevents duplicate runs)
 * - Survives server restarts
 * - Configurable via environment variables
 * - Graceful shutdown handling
 * - Error recovery and logging with retries
 */
@Injectable()
export class SessionSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: PinoLoggerService;

  // Event emitter callback - set by RealtimeGateway
  private onStatusUpdate: ((update: SessionStatusUpdate) => void) | null = null;

  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectQueue(SESSION_SCHEDULER_QUEUE)
    private readonly schedulerQueue: Bull.Queue,
    private readonly configService: ConfigService,
    private readonly processor: SessionSchedulerProcessor,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SessionSchedulerService.name);
  }

  /**
   * Register callback for status updates (used by RealtimeGateway)
   */
  registerStatusUpdateCallback(
    callback: (update: SessionStatusUpdate) => void,
  ): void {
    this.onStatusUpdate = callback;
    // Also register with the processor for distributed job processing
    this.processor.registerLifecycleUpdateCallback(callback as any);
    this.logger.debug('Status update callback registered');
  }

  /**
   * Unregister the callback
   */
  unregisterStatusUpdateCallback(): void {
    this.onStatusUpdate = null;
    this.processor.unregisterLifecycleUpdateCallback();
  }

  async onModuleInit() {
    await this.setupRecurringJobs();
  }

  async onModuleDestroy() {
    await this.cleanupJobs();
  }

  /**
   * Setup recurring jobs using Bull's repeat feature
   * This ensures only one instance processes jobs even with multiple servers
   */
  private async setupRecurringJobs(): Promise<void> {
    const intervalMs = this.configService.get<number>(
      'sessionScheduler.checkIntervalMs',
      30000,
    );
    const autoOpenMinutes = this.configService.get<number>(
      'sessionScheduler.autoOpenMinutesBefore',
      10,
    );

    this.logger.log('Setting up session scheduler jobs', {
      intervalMs,
      autoOpenMinutes,
    });

    // Clean up any existing repeatable jobs first
    const existingJobs = await this.schedulerQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      await this.schedulerQueue.removeRepeatableByKey(job.key);
    }

    // Add auto-open job with repeat
    await this.schedulerQueue.add(
      'auto-open-sessions',
      { type: 'auto-open' },
      {
        repeat: {
          every: intervalMs,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs for debugging
        removeOnFail: 50, // Keep last 50 failed jobs for debugging
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
      },
    );

    // Add auto-end job with repeat
    await this.schedulerQueue.add(
      'auto-end-sessions',
      { type: 'auto-end' },
      {
        repeat: {
          every: intervalMs,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log('Session scheduler jobs configured successfully');

    // Run initial jobs immediately
    await this.forceCycle();
  }

  /**
   * Cleanup jobs on shutdown
   */
  private async cleanupJobs(): Promise<void> {
    this.logger.debug('Cleaning up session scheduler jobs');
    // Jobs will continue to run on other instances
  }

  /**
   * Manually update a session's status (called from SessionsService)
   * This is used when admin manually opens/closes a session
   * Note: The database has already been updated by SessionsService,
   * so we just emit the real-time update
   */
  async manualStatusUpdate(
    sessionId: string,
    newStatus: SessionStatus,
    newIsOpen: boolean,
    previousStatus?: SessionStatus,
    previousIsOpen?: boolean,
  ): Promise<SessionStatusUpdate | null> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      return null;
    }

    // Use provided previous values or infer from current state
    const prevStatus = previousStatus ?? session.status;
    const prevIsOpen = previousIsOpen ?? session.isOpen;

    const update: SessionStatusUpdate = {
      sessionId: session._id.toString(),
      sessionName: session.name,
      previousStatus: prevStatus,
      newStatus,
      previousIsOpen: prevIsOpen,
      newIsOpen,
      reason: 'manual',
      timestamp: new Date(),
    };

    this.logger.log('Session manually updated', {
      sessionId: session._id.toString(),
      sessionName: session.name,
      previousStatus: prevStatus,
      newStatus,
    });

    // Emit real-time update
    if (this.onStatusUpdate) {
      this.onStatusUpdate(update);
    } else {
      this.logger.warn(
        'No status update callback registered - real-time update not sent',
        { sessionId: session._id.toString() },
      );
    }

    return update;
  }

  /**
   * Get sessions that will auto-open soon (for UI preview)
   */
  async getUpcomingAutoOpen(): Promise<
    Array<{ session: SessionDocument; opensIn: number }>
  > {
    const autoOpenMinutes = this.configService.get<number>(
      'sessionScheduler.autoOpenMinutesBefore',
      10,
    );
    const now = new Date();
    const previewWindow = new Date(now.getTime() + 60 * 60 * 1000); // Next hour

    const sessions = await this.sessionModel
      .find({
        status: SessionStatus.SCHEDULED,
        startTime: {
          $gt: new Date(now.getTime() + autoOpenMinutes * 60 * 1000), // After current auto-open window
          $lte: new Date(previewWindow.getTime() + autoOpenMinutes * 60 * 1000), // Within preview window
        },
      })
      .sort({ startTime: 1 })
      .exec();

    return sessions.map((session) => ({
      session,
      opensIn: Math.round(
        (new Date(session.startTime).getTime() -
          autoOpenMinutes * 60 * 1000 -
          now.getTime()) /
          60000,
      ),
    }));
  }

  /**
   * Get scheduler configuration (for API exposure)
   */
  getSchedulerConfig(): {
    autoOpenMinutesBefore: number;
    checkIntervalMs: number;
    autoEndEnabled: boolean;
    autoEndGraceMinutes: number;
  } {
    return {
      autoOpenMinutesBefore: this.configService.get<number>(
        'sessionScheduler.autoOpenMinutesBefore',
        10,
      ),
      checkIntervalMs: this.configService.get<number>(
        'sessionScheduler.checkIntervalMs',
        30000,
      ),
      autoEndEnabled: this.configService.get<boolean>(
        'sessionScheduler.autoEndEnabled',
        true,
      ),
      autoEndGraceMinutes: this.configService.get<number>(
        'sessionScheduler.autoEndGraceMinutes',
        0,
      ),
    };
  }

  /**
   * Force a scheduler cycle (for testing/admin purposes)
   * Adds jobs to be processed immediately
   */
  async forceCycle(): Promise<{ autoOpenJobId: string; autoEndJobId: string }> {
    const autoOpenJob = await this.schedulerQueue.add(
      'auto-open-sessions',
      { type: 'auto-open' },
      { removeOnComplete: true, removeOnFail: false },
    );

    const autoEndJob = await this.schedulerQueue.add(
      'auto-end-sessions',
      { type: 'auto-end' },
      { removeOnComplete: true, removeOnFail: false },
    );

    return {
      autoOpenJobId: autoOpenJob.id.toString(),
      autoEndJobId: autoEndJob.id.toString(),
    };
  }

  /**
   * Get queue status (for monitoring)
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const [waiting, active, completed, failed, delayed, paused] =
      await Promise.all([
        this.schedulerQueue.getWaitingCount(),
        this.schedulerQueue.getActiveCount(),
        this.schedulerQueue.getCompletedCount(),
        this.schedulerQueue.getFailedCount(),
        this.schedulerQueue.getDelayedCount(),
        this.schedulerQueue.getPausedCount(),
      ]);

    return { waiting, active, completed, failed, delayed, paused };
  }

  /**
   * Pause the scheduler
   */
  async pauseScheduler(): Promise<void> {
    await this.schedulerQueue.pause();
    this.logger.log('Session scheduler paused');
  }

  /**
   * Resume the scheduler
   */
  async resumeScheduler(): Promise<void> {
    await this.schedulerQueue.resume();
    this.logger.log('Session scheduler resumed');
  }
}
