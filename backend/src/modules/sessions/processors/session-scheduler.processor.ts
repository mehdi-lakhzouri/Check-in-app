import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import * as Bull from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Session, SessionDocument, SessionStatus } from '../schemas';
import { SessionStatusUpdate } from '../services/session-scheduler.service';
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
  private onStatusUpdate: ((update: SessionStatusUpdate) => void) | null = null;

  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    private readonly configService: ConfigService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(SessionSchedulerProcessor.name);
  }

  /**
   * Register callback for status updates (used by RealtimeGateway)
   */
  registerStatusUpdateCallback(callback: (update: SessionStatusUpdate) => void): void {
    this.onStatusUpdate = callback;
    this.logger.debug('Status update callback registered with processor');
  }

  /**
   * Unregister the callback
   */
  unregisterStatusUpdateCallback(): void {
    this.onStatusUpdate = null;
  }

  @OnQueueActive()
  onActive(job: Bull.Job<SessionSchedulerJobData>) {
    this.logger.verbose(`Processing job ${job.id} of type ${job.data.type}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Bull.Job<SessionSchedulerJobData>, result: any) {
    this.logger.verbose(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Bull.Job<SessionSchedulerJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack);
  }

  /**
   * Process auto-open sessions job
   * Opens sessions that are within AUTO_OPEN_MINUTES_BEFORE of their start time
   */
  @Process('auto-open-sessions')
  async handleAutoOpen(job: Bull.Job<AutoOpenJobData>): Promise<{ opened: number; sessions: string[] }> {
    this.logger.log('Processing auto-open-sessions job');
    
    const autoOpenMinutes = this.configService.get<number>('sessionScheduler.autoOpenMinutesBefore', 10);
    const now = new Date();
    const openThreshold = new Date(now.getTime() + autoOpenMinutes * 60 * 1000);

    // Find sessions that:
    // 1. Are still in SCHEDULED status
    // 2. Have startTime within the auto-open window
    // 3. Haven't ended yet
    const sessionsToOpen = await this.sessionModel.find({
      status: SessionStatus.SCHEDULED,
      startTime: { $lte: openThreshold },
      endTime: { $gt: now },
    }).exec();

    const openedSessions: string[] = [];

    for (const session of sessionsToOpen) {
      try {
        const update = await this.updateSessionStatus(
          session,
          SessionStatus.OPEN,
          true,
          'auto_open'
        );
        if (update) {
          openedSessions.push(session.name);
        }
      } catch (error) {
        this.logger.error(`Failed to auto-open session ${session._id}: ${error.message}`);
      }
    }

    if (openedSessions.length > 0) {
      this.logger.log(`Auto-opened ${openedSessions.length} sessions: ${openedSessions.join(', ')}`);
    }

    return { opened: openedSessions.length, sessions: openedSessions };
  }

  /**
   * Process auto-end sessions job
   * Ends sessions that have passed their end time
   */
  @Process('auto-end-sessions')
  async handleAutoEnd(job: Bull.Job<AutoEndJobData>): Promise<{ ended: number; sessions: string[] }> {
    this.logger.log('Processing auto-end-sessions job');
    
    const autoEndEnabled = this.configService.get<boolean>('sessionScheduler.autoEndEnabled', true);
    if (!autoEndEnabled) {
      return { ended: 0, sessions: [] };
    }

    const graceMinutes = this.configService.get<number>('sessionScheduler.autoEndGraceMinutes', 0);
    const now = new Date();
    const endThreshold = new Date(now.getTime() - graceMinutes * 60 * 1000);

    // Find sessions that:
    // 1. Are in OPEN status
    // 2. Have endTime before the threshold (past their end time + grace period)
    const sessionsToEnd = await this.sessionModel.find({
      status: SessionStatus.OPEN,
      endTime: { $lte: endThreshold },
    }).exec();

    const endedSessions: string[] = [];

    for (const session of sessionsToEnd) {
      try {
        const update = await this.updateSessionStatus(
          session,
          SessionStatus.ENDED,
          false,
          'auto_end'
        );
        if (update) {
          endedSessions.push(session.name);
        }
      } catch (error) {
        this.logger.error(`Failed to auto-end session ${session._id}: ${error.message}`);
      }
    }

    if (endedSessions.length > 0) {
      this.logger.log(`Auto-ended ${endedSessions.length} sessions: ${endedSessions.join(', ')}`);
    }

    return { ended: endedSessions.length, sessions: endedSessions };
  }

  /**
   * Update a session's status and emit real-time event
   */
  private async updateSessionStatus(
    session: SessionDocument,
    newStatus: SessionStatus,
    newIsOpen: boolean,
    reason: 'auto_open' | 'auto_end' | 'manual'
  ): Promise<SessionStatusUpdate | null> {
    const previousStatus = session.status;
    const previousIsOpen = session.isOpen;

    // Skip if status hasn't changed
    if (previousStatus === newStatus && previousIsOpen === newIsOpen) {
      return null;
    }

    // Update in database
    await this.sessionModel.updateOne(
      { _id: session._id },
      { 
        $set: { 
          status: newStatus, 
          isOpen: newIsOpen,
          updatedAt: new Date(),
        } 
      }
    ).exec();

    const update: SessionStatusUpdate = {
      sessionId: session._id.toString(),
      sessionName: session.name,
      previousStatus,
      newStatus,
      previousIsOpen,
      newIsOpen,
      reason,
      timestamp: new Date(),
    };

    this.logger.log(
      `Session "${session.name}" status changed: ${previousStatus} -> ${newStatus} (${reason})`
    );

    // Emit real-time update
    if (this.onStatusUpdate) {
      this.onStatusUpdate(update);
    }

    return update;
  }
}
