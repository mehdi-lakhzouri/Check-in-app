import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParticipantsService } from '../participants/services';
import { CheckInsService } from '../checkins/services';
import {
  SessionsService,
  SessionSchedulerService,
  SessionStatusUpdate,
} from '../sessions/services';
import { SessionStatus } from '../sessions/schemas';
import { PinoLoggerService } from '../../common/logger';

// Logger instance for static function (getCorsOrigins)
const corsLogger = new PinoLoggerService();
corsLogger.setContext('CORS');

export interface AmbassadorScoreUpdate {
  ambassadorId: string;
  name: string;
  newScore: number;
  previousScore: number;
  referralCount: number;
  rank: number;
}

export interface TravelGrantUpdate {
  participantId: string;
  name: string;
  status: 'applied' | 'approved' | 'rejected';
  timestamp: Date;
}

export interface CheckInUpdate {
  sessionId: string;
  participantId: string;
  participantName: string;
  sessionName: string;
  timestamp: Date;
  isLate: boolean;
}

/**
 * Enhanced check-in update with badge information
 */
export interface CheckInAcceptedUpdate {
  checkInId: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  sessionName: string;
  badge: 'accepted' | 'accepted_unregistered';
  wasRegistered: boolean;
  isLate: boolean;
  timestamp: Date;
}

/**
 * Check-in declined event
 */
export interface CheckInDeclinedUpdate {
  attemptId: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  sessionName: string;
  reason: string;
  wasRegistered: boolean;
  timestamp: Date;
}

/**
 * QR Verification event for dashboard tracking
 */
export interface CheckInVerificationUpdate {
  sessionId: string;
  participantId: string;
  participantName: string;
  sessionName: string;
  badge: 'REGISTERED' | 'NOT_REGISTERED' | 'ALREADY_CHECKED_IN';
  isRegistered: boolean;
  timestamp: Date;
}

export interface SessionCapacityUpdate {
  sessionId: string;
  sessionName: string;
  checkInsCount: number;
  capacity: number;
  percentFull: number;
  isNearCapacity: boolean;
  isAtCapacity: boolean;
}

/**
 * Session Status Update - Real-time status change notification
 */
export interface SessionStatusUpdatePayload {
  sessionId: string;
  sessionName: string;
  previousStatus: SessionStatus;
  newStatus: SessionStatus;
  previousIsOpen: boolean;
  newIsOpen: boolean;
  reason: 'auto_open' | 'auto_end' | 'manual';
  timestamp: Date;
}

// Get CORS origins from environment with production-ready validation
const getCorsOrigins = ():
  | string[]
  | ((
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const origins = process.env.CORS_ORIGINS;

  // Development mode: allow localhost origins
  if (nodeEnv === 'development' && !origins) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  // Production mode: require explicit CORS_ORIGINS
  if (!origins) {
    corsLogger.warn('CORS_ORIGINS not set in production mode', {
      environment: nodeEnv,
      fallback: 'empty array (restrictive)',
    });
    return [];
  }

  // Parse and validate origins
  const allowedOrigins = origins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => {
      // Validate origin format (must be http:// or https://)
      const isValid = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(origin);
      if (!isValid) {
        corsLogger.warn('Invalid CORS origin ignored', { origin });
      }
      return isValid;
    });

  // Return a function for dynamic origin validation
  return (
    origin: string,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
  };
};

@Injectable()
@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger: PinoLoggerService;
  private connectedClients: Map<string, { subscribedTo: Set<string> }> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly participantsService: ParticipantsService,
    private readonly checkInsService: CheckInsService,
    private readonly sessionsService: SessionsService,
    private readonly sessionSchedulerService: SessionSchedulerService,
  ) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(RealtimeGateway.name);
  }

  /**
   * Register callback with SessionSchedulerService for real-time updates
   */
  onModuleInit() {
    this.sessionSchedulerService.registerStatusUpdateCallback(
      (update: SessionStatusUpdate) =>
        this.broadcastSessionStatusUpdate(update),
    );
    this.logger.debug('Registered session status update callback');
  }

  /**
   * Called after WebSocket server is initialized
   * Note: Redis adapter is configured via RedisIoAdapter in main.ts
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug('Client connected', { clientId: client.id });
    this.connectedClients.set(client.id, { subscribedTo: new Set() });

    // Send initial connection confirmation
    client.emit('connected', {
      message: 'Connected to IASTAM real-time server',
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.debug('Client disconnected', { clientId: client.id });
    this.connectedClients.delete(client.id);
  }

  // ============================================================================
  // Subscription Handlers
  // ============================================================================

  @SubscribeMessage('subscribe:ambassadors')
  async handleSubscribeAmbassadors(@ConnectedSocket() client: Socket) {
    this.logger.debug('Client subscribed to ambassadors', {
      clientId: client.id,
    });
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.subscribedTo.add('ambassadors');
      client.join('ambassadors');
    }

    // Send initial ambassador data
    const leaderboard =
      await this.participantsService.getAmbassadorLeaderboard(50);
    client.emit('ambassadors:leaderboard', {
      type: 'initial',
      data: leaderboard.map((a, index) => ({
        _id: a._id.toString(),
        name: a.name,
        email: a.email,
        organization: a.organization,
        ambassadorPoints: a.ambassadorPoints,
        referralCount: a.referredParticipantIds.length,
        rank: index + 1,
      })),
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('subscribe:travel-grants')
  async handleSubscribeTravelGrants(@ConnectedSocket() client: Socket) {
    this.logger.debug('Client subscribed to travel grants', {
      clientId: client.id,
    });
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.subscribedTo.add('travel-grants');
      client.join('travel-grants');
    }

    // Send initial travel grant data
    const [applications, stats] = await Promise.all([
      this.participantsService.getTravelGrantApplications(),
      this.participantsService.getTravelGrantStats(),
    ]);

    client.emit('travel-grants:data', {
      type: 'initial',
      applications,
      stats,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('subscribe:sessions')
  async handleSubscribeSessions(@ConnectedSocket() client: Socket) {
    this.logger.debug('Client subscribed to sessions', { clientId: client.id });
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.subscribedTo.add('sessions');
      client.join('sessions');
    }

    // Send initial session data
    const sessions = await this.sessionsService.findAll({ limit: 100 });
    client.emit('sessions:data', {
      type: 'initial',
      data: sessions.data,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('subscribe:ambassador-detail')
  async handleSubscribeAmbassadorDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ambassadorId: string },
  ) {
    const roomName = `ambassador:${data.ambassadorId}`;
    this.logger.debug('Client subscribed to ambassador detail', {
      clientId: client.id,
      roomName,
    });
    client.join(roomName);

    // Send detailed ambassador data with check-ins
    await this.sendAmbassadorDetail(client, data.ambassadorId);
  }

  @SubscribeMessage('subscribe:travel-grant-detail')
  async handleSubscribeTravelGrantDetail(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { participantId: string },
  ) {
    const roomName = `travel-grant:${data.participantId}`;
    this.logger.debug('Client subscribed to travel grant detail', {
      clientId: client.id,
      roomName,
    });
    client.join(roomName);

    // Send detailed travel grant data
    await this.sendTravelGrantDetail(client, data.participantId);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    this.logger.debug('Client unsubscribed', {
      clientId: client.id,
      channel: data.channel,
    });
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.subscribedTo.delete(data.channel);
      client.leave(data.channel);
    }
  }

  // ============================================================================
  // Data Retrieval Methods
  // ============================================================================

  private async sendAmbassadorDetail(client: Socket, ambassadorId: string) {
    try {
      const ambassador = await this.participantsService.findOne(ambassadorId);
      const checkIns =
        await this.checkInsService.findByParticipant(ambassadorId);

      // Get referred participants with their check-in status
      const referredIds = ambassador.referredParticipantIds.map((id) =>
        id.toString(),
      );
      const referredParticipants =
        await this.participantsService.findByIds(referredIds);

      const referredWithCheckIns = await Promise.all(
        referredParticipants.map(async (p) => {
          const pCheckIns = await this.checkInsService.findByParticipant(
            p._id.toString(),
          );
          return {
            _id: p._id.toString(),
            name: p.name,
            email: p.email,
            organization: p.organization,
            status: p.status,
            isActive: p.isActive,
            checkInsCount: pCheckIns.length,
            lastCheckIn:
              pCheckIns.length > 0
                ? pCheckIns.sort(
                    (a, b) =>
                      new Date(b.checkInTime).getTime() -
                      new Date(a.checkInTime).getTime(),
                  )[0].checkInTime
                : null,
          };
        }),
      );

      client.emit('ambassador:detail', {
        ambassador: {
          _id: ambassador._id.toString(),
          name: ambassador.name,
          email: ambassador.email,
          organization: ambassador.organization,
          ambassadorPoints: ambassador.ambassadorPoints,
          referralCount: ambassador.referredParticipantIds.length,
          isActive: ambassador.isActive,
          createdAt: ambassador['createdAt'],
        },
        referredParticipants: referredWithCheckIns,
        checkIns: checkIns.map((c) => ({
          _id: c._id.toString(),
          sessionId: c.sessionId.toString(),
          checkInTime: c.checkInTime,
          isLate: c.isLate,
        })),
        stats: {
          totalReferrals: referredWithCheckIns.length,
          activeReferrals: referredWithCheckIns.filter((p) => p.isActive)
            .length,
          totalCheckIns: checkIns.length,
          referralCheckIns: referredWithCheckIns.reduce(
            (sum, p) => sum + p.checkInsCount,
            0,
          ),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error fetching ambassador detail', error.stack, {
        error: error.message,
      });
      client.emit('error', { message: 'Failed to fetch ambassador details' });
    }
  }

  private async sendTravelGrantDetail(client: Socket, participantId: string) {
    try {
      const participant = await this.participantsService.findOne(participantId);
      const checkIns =
        await this.checkInsService.findByParticipant(participantId);

      // Get participants from same organization
      const orgParticipants = participant.organization
        ? await this.participantsService.findByOrganization(
            participant.organization,
          )
        : [];

      const orgParticipantsWithCheckIns = await Promise.all(
        orgParticipants
          .filter((p) => p._id.toString() !== participantId)
          .slice(0, 10) // Limit to 10
          .map(async (p) => {
            const pCheckIns = await this.checkInsService.findByParticipant(
              p._id.toString(),
            );
            return {
              _id: p._id.toString(),
              name: p.name,
              email: p.email,
              status: p.status,
              checkInsCount: pCheckIns.length,
            };
          }),
      );

      client.emit('travel-grant:detail', {
        participant: {
          _id: participant._id.toString(),
          name: participant.name,
          email: participant.email,
          organization: participant.organization,
          status: participant.status,
          travelGrantApplied: participant.travelGrantApplied,
          travelGrantApproved: participant.travelGrantApproved,
          travelGrantAppliedAt: participant.travelGrantAppliedAt,
          travelGrantDecidedAt: participant.travelGrantDecidedAt,
          isActive: participant.isActive,
          createdAt: participant['createdAt'],
        },
        checkIns: checkIns.map((c) => ({
          _id: c._id.toString(),
          sessionId: c.sessionId.toString(),
          checkInTime: c.checkInTime,
          isLate: c.isLate,
        })),
        organizationPeers: orgParticipantsWithCheckIns,
        stats: {
          totalCheckIns: checkIns.length,
          onTimeCheckIns: checkIns.filter((c) => !c.isLate).length,
          lateCheckIns: checkIns.filter((c) => c.isLate).length,
          organizationPeersCount: orgParticipants.length - 1,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error fetching travel grant detail', error.stack, {
        error: error.message,
      });
      client.emit('error', { message: 'Failed to fetch travel grant details' });
    }
  }

  // ============================================================================
  // Broadcast Methods (called from services)
  // ============================================================================

  broadcastAmbassadorScoreUpdate(update: AmbassadorScoreUpdate) {
    this.logger.log('Broadcasting ambassador score update', {
      ambassadorId: update.ambassadorId,
    });
    this.server.to('ambassadors').emit('ambassadors:score-update', {
      type: 'score-update',
      data: update,
      timestamp: new Date(),
    });

    // Also emit to specific ambassador room
    this.server
      .to(`ambassador:${update.ambassadorId}`)
      .emit('ambassador:score-update', {
        type: 'score-update',
        data: update,
        timestamp: new Date(),
      });
  }

  broadcastTravelGrantUpdate(update: TravelGrantUpdate) {
    this.logger.log('Broadcasting travel grant update', {
      participantId: update.participantId,
    });
    this.server.to('travel-grants').emit('travel-grants:update', {
      type: 'status-update',
      data: update,
      timestamp: new Date(),
    });

    this.server
      .to(`travel-grant:${update.participantId}`)
      .emit('travel-grant:update', {
        type: 'status-update',
        data: update,
        timestamp: new Date(),
      });
  }

  broadcastCheckInUpdate(update: CheckInUpdate) {
    this.logger.log('Broadcasting check-in update', {
      participantId: update.participantId,
      sessionId: update.sessionId,
    });

    // Broadcast to sessions room
    this.server.to('sessions').emit('sessions:checkin', {
      type: 'checkin',
      data: update,
      timestamp: new Date(),
    });

    // Broadcast to ambassadors room (might affect referral check-ins)
    this.server.to('ambassadors').emit('ambassadors:checkin', {
      type: 'checkin',
      data: update,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast QR verification event for dashboard tracking
   */
  broadcastCheckInVerification(update: CheckInVerificationUpdate) {
    this.logger.log('Broadcasting check-in verification', {
      participantId: update.participantId,
      sessionId: update.sessionId,
      badge: update.badge,
    });

    this.server.to('sessions').emit('checkin:verification', {
      type: 'verification',
      data: update,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast check-in accepted event with badge
   */
  broadcastCheckInAccepted(update: CheckInAcceptedUpdate) {
    this.logger.log('Broadcasting check-in accepted', {
      checkInId: update.checkInId,
      participantId: update.participantId,
      sessionId: update.sessionId,
      badge: update.badge,
    });

    // Broadcast to sessions room
    this.server.to('sessions').emit('checkin:accepted', {
      type: 'accepted',
      data: update,
      timestamp: new Date(),
    });

    // Also emit the standard check-in update for backward compatibility
    this.broadcastCheckInUpdate({
      sessionId: update.sessionId,
      participantId: update.participantId,
      participantName: update.participantName,
      sessionName: update.sessionName,
      timestamp: update.timestamp,
      isLate: update.isLate,
    });
  }

  /**
   * Broadcast check-in declined event
   */
  broadcastCheckInDeclined(update: CheckInDeclinedUpdate) {
    this.logger.log('Broadcasting check-in declined', {
      attemptId: update.attemptId,
      participantId: update.participantId,
      sessionId: update.sessionId,
      reason: update.reason,
    });

    this.server.to('sessions').emit('checkin:declined', {
      type: 'declined',
      data: update,
      timestamp: new Date(),
    });
  }

  broadcastSessionCapacityUpdate(update: SessionCapacityUpdate) {
    this.logger.log('Broadcasting session capacity update', {
      sessionId: update.sessionId,
    });
    this.server.to('sessions').emit('sessions:capacity-update', {
      type: 'capacity-update',
      data: update,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast session status update (open, ended, closed, etc.)
   * Called by SessionSchedulerService when status changes
   */
  broadcastSessionStatusUpdate(update: SessionStatusUpdate) {
    this.logger.log('Broadcasting session status update', {
      sessionName: update.sessionName,
      previousStatus: update.previousStatus,
      newStatus: update.newStatus,
      reason: update.reason,
    });

    // Broadcast to all clients in 'sessions' room
    this.server.to('sessions').emit('sessions:status-update', {
      type: 'status-update',
      data: {
        sessionId: update.sessionId,
        sessionName: update.sessionName,
        previousStatus: update.previousStatus,
        newStatus: update.newStatus,
        previousIsOpen: update.previousIsOpen,
        newIsOpen: update.newIsOpen,
        reason: update.reason,
        timestamp: update.timestamp,
      } as SessionStatusUpdatePayload,
      timestamp: new Date(),
    });

    // Also emit a generic session update for clients listening to individual sessions
    this.server.emit('sessionStatusUpdated', {
      sessionId: update.sessionId,
      sessionName: update.sessionName,
      previousStatus: update.previousStatus,
      newStatus: update.newStatus,
      isOpen: update.newIsOpen,
      reason: update.reason,
      timestamp: update.timestamp,
    });
  }

  // Refresh all ambassador data
  async broadcastAmbassadorLeaderboard() {
    const leaderboard =
      await this.participantsService.getAmbassadorLeaderboard(50);
    this.server.to('ambassadors').emit('ambassadors:leaderboard', {
      type: 'refresh',
      data: leaderboard.map((a, index) => ({
        _id: a._id.toString(),
        name: a.name,
        email: a.email,
        organization: a.organization,
        ambassadorPoints: a.ambassadorPoints,
        referralCount: a.referredParticipantIds.length,
        rank: index + 1,
      })),
      timestamp: new Date(),
    });
  }

  // Refresh travel grant stats
  async broadcastTravelGrantStats() {
    const stats = await this.participantsService.getTravelGrantStats();
    this.server.to('travel-grants').emit('travel-grants:stats', {
      type: 'refresh',
      data: stats,
      timestamp: new Date(),
    });
  }
}
