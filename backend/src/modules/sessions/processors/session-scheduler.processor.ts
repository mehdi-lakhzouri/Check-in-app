import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import * as Bull from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Session, SessionDocument, SessionStatus } from '../schemas';
import { SessionLifecycleUpdate } from '../services/session-scheduler.service';
import { PinoLoggerService } from '../../../common/logger';

export const SESSION_SCHEDULER_QUEUE = 'session-scheduler';

export interface AutoOpenJobData {
  type: 'auto-open';
}

export interface AutoEndJobData {
  type: 'auto-end';
}

export type SessionSchedulerJobData = AutoOpenJobData | AutoEndJobData;

/**
 * Session Scheduler Processor
 *
 * Handles distributed job processing for session status management.
 * Uses Bull queue with Redis for:
 * - Distributed locking (prevents duplicate runs across instances)
 * - Reliable job execution (survives server restarts)
 * - Job retries on failure
 * - Concurrency control
 */
@Processor(SESSION_SCHEDULER_QUEUE)
export class SessionSchedulerProcessor {
  private readonly logger: PinoLoggerService;

  // Event emitter callback - set by RealtimeGateway
  private onLifecycleUpdate: ((update: SessionLifecycleUpdate) => void) | null =
    null;

  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SessionSchedulerProcessor.name);
  }

  /**
   * Register callback for lifecycle updates (used by RealtimeGateway)
   */
  registerLifecycleUpdateCallback(
    callback: (update: SessionLifecycleUpdate) => void,
  ): void {
    this.onLifecycleUpdate = callback;
    this.logger.debug('Lifecycle update callback registered with processor');
  }

  /**
   * Unregister the callback
   */
  unregisterLifecycleUpdateCallback(): void {
    this.onLifecycleUpdate = null;
  }

  // ============================================================================
  // Per-Session Timing Resolution (with fallback to global config)
  // ============================================================================

  /**
   * Get auto-open minutes for a session (per-session override or global default)
   */
  private getAutoOpenMinutes(session: SessionDocument): number {
    if (
      session.autoOpenMinutesBefore !== undefined &&
      session.autoOpenMinutesBefore !== null
    ) {
      return session.autoOpenMinutesBefore;
    }
    return this.configService.get<number>(
      'sessionScheduler.autoOpenMinutesBefore',
      10,
    );
  }

  /**
   * Get auto-end grace minutes for a session (per-session override or global default)
   */
  private getAutoEndGraceMinutes(session: SessionDocument): number {
    if (
      session.autoEndGraceMinutes !== undefined &&
      session.autoEndGraceMinutes !== null
    ) {
      return session.autoEndGraceMinutes;
    }
    return this.configService.get<number>(
      'sessionScheduler.autoEndGraceMinutes',
      0,
    );
  }

  /**
   * Get late threshold minutes for a session (per-session override or global default)
   * Exposed as public for use by CheckInsService
   */
  public getLateThresholdMinutes(session: SessionDocument): number {
    if (
      session.lateThresholdMinutes !== undefined &&
      session.lateThresholdMinutes !== null
    ) {
      return session.lateThresholdMinutes;
    }
    return this.configService.get<number>('app.checkinLateThresholdMinutes', 10);
  }

  @OnQueueActive()
  onActive(job: Bull.Job<SessionSchedulerJobData>) {
    this.logger.verbose(`Processing job ${job.id} of type ${job.data.type}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Bull.Job<SessionSchedulerJobData>, result: any) {
    this.logger.verbose(
      `Job ${job.id} completed with result: ${JSON.stringify(result)}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Bull.Job<SessionSchedulerJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed with error: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Process auto-open sessions job
   * Opens sessions that are within their auto-open window (per-session or global config)
   */
  @Process('auto-open-sessions')
  async handleAutoOpen(
    _job: Bull.Job<AutoOpenJobData>,
  ): Promise<{ opened: number; sessions: string[] }> {
    this.logger.log('Processing auto-open-sessions job');

    const globalAutoOpenMinutes = this.configService.get<number>(
      'sessionScheduler.autoOpenMinutesBefore',
      10,
    );
    const now = new Date();

    // Find all SCHEDULED sessions that haven't ended yet
    // We'll check each session's individual timing configuration
    const scheduledSessions = await this.sessionModel
      .find({
        status: SessionStatus.SCHEDULED,
        endTime: { $gt: now },
      })
      .exec();

    const openedSessions: string[] = [];

    for (const session of scheduledSessions) {
      try {
        // Get per-session or global auto-open minutes
        const autoOpenMinutes = this.getAutoOpenMinutes(session);
        const openThreshold = new Date(
          new Date(session.startTime).getTime() - autoOpenMinutes * 60 * 1000,
        );

        // Check if current time is past the open threshold
        if (now >= openThreshold) {
          this.logger.debug(
            `Session "${session.name}" qualifies for auto-open (threshold: ${autoOpenMinutes} min before start)`,
          );
          const update = await this.updateSessionLifecycle(
            session,
            SessionStatus.OPEN,
            true,
            'auto_open',
          );
          if (update) {
            openedSessions.push(session.name);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-open session ${session._id}: ${error.message}`,
        );
      }
    }

    if (openedSessions.length > 0) {
      this.logger.log(
        `Auto-opened ${openedSessions.length} sessions: ${openedSessions.join(', ')}`,
      );
    }

    return { opened: openedSessions.length, sessions: openedSessions };
  }

  /**
   * Process auto-end sessions job
   * Ends sessions that have passed their end time (with per-session or global grace period)
   */
  @Process('auto-end-sessions')
  async handleAutoEnd(
    _job: Bull.Job<AutoEndJobData>,
  ): Promise<{ ended: number; sessions: string[] }> {
    this.logger.log('Processing auto-end-sessions job');

    const autoEndEnabled = this.configService.get<boolean>(
      'sessionScheduler.autoEndEnabled',
      true,
    );
    if (!autoEndEnabled) {
      return { ended: 0, sessions: [] };
    }

    const now = new Date();

    // Find all OPEN or SCHEDULED sessions
    // We'll check each session's individual timing configuration
    const activeSessions = await this.sessionModel
      .find({
        status: { $in: [SessionStatus.OPEN, SessionStatus.SCHEDULED] },
      })
      .exec();

    const endedSessions: string[] = [];

    for (const session of activeSessions) {
      try {
        // Get per-session or global grace minutes
        const graceMinutes = this.getAutoEndGraceMinutes(session);
        const endThreshold = new Date(
          new Date(session.endTime).getTime() + graceMinutes * 60 * 1000,
        );

        // Check if current time is past the end threshold (endTime + grace period)
        if (now >= endThreshold) {
          this.logger.debug(
            `Session "${session.name}" qualifies for auto-end (grace: ${graceMinutes} min after end)`,
          );
          const update = await this.updateSessionLifecycle(
            session,
            SessionStatus.ENDED,
            false,
            'auto_end',
          );
          if (update) {
            endedSessions.push(session.name);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-end session ${session._id}: ${error.message}`,
        );
      }
    }

    if (endedSessions.length > 0) {
      this.logger.log(
        `Auto-ended ${endedSessions.length} sessions: ${endedSessions.join(', ')}`,
      );
    }

    return { ended: endedSessions.length, sessions: endedSessions };
  }

  /**
   * Update a session's lifecycle and emit real-time event
   */
  private async updateSessionLifecycle(
    session: SessionDocument,
    newLifecycle: SessionStatus,
    newIsOpen: boolean,
    reason: 'auto_open' | 'auto_end' | 'manual',
  ): Promise<SessionLifecycleUpdate | null> {
    const previousLifecycle = session.status;
    const previousIsOpen = session.isOpen;

    // Skip if lifecycle hasn't changed
    if (previousLifecycle === newLifecycle && previousIsOpen === newIsOpen) {
      return null;
    }

    // Update in database
    await this.sessionModel
      .updateOne(
        { _id: session._id },
        {
          $set: {
            status: newLifecycle,
            isOpen: newIsOpen,
            updatedAt: new Date(),
          },
        },
      )
      .exec();

    const update: SessionLifecycleUpdate = {
      sessionId: session._id.toString(),
      sessionName: session.name,
      previousLifecycle,
      newLifecycle,
      previousIsOpen,
      newIsOpen,
      reason,
      timestamp: new Date(),
    };

    this.logger.log(
      `Session "${session.name}" lifecycle changed: ${previousLifecycle} -> ${newLifecycle} (${reason})`,
    );

    // Emit real-time update
    if (this.onLifecycleUpdate) {
      this.onLifecycleUpdate(update);
    }

    return update;
  }
}
