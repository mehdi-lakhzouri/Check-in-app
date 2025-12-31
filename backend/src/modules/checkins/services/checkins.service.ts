import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { CheckInRepository } from '../repositories';
import { CreateCheckInDto, QrCheckInDto, CheckInFilterDto } from '../dto';
import { CheckInDocument, CheckInMethod } from '../schemas';
import { 
  EntityNotFoundException, 
  EntityExistsException, 
  ValidationException,
} from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';
import { ParticipantsService } from '../../participants/services';
import { SessionsService } from '../../sessions/services';

@Injectable()
export class CheckInsService {
  private readonly logger = new Logger(CheckInsService.name);
  private readonly lateThresholdMinutes: number;

  constructor(
    private readonly checkInRepository: CheckInRepository,
    private readonly participantsService: ParticipantsService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {
    this.lateThresholdMinutes = this.configService.get<number>('app.checkinLateThresholdMinutes', 10);
    this.logger.log(`Late check-in threshold set to ${this.lateThresholdMinutes} minutes`);
  }

  /**
   * Determines if a check-in is late based on session start time and threshold
   */
  private isCheckInLate(checkInTime: Date, sessionStartTime: Date): boolean {
    const thresholdMs = this.lateThresholdMinutes * 60 * 1000;
    const lateThreshold = new Date(sessionStartTime.getTime() + thresholdMs);
    return checkInTime > lateThreshold;
  }

  async create(createCheckInDto: CreateCheckInDto): Promise<CheckInDocument> {
    this.logger.log(
      `Creating check-in for participant ${createCheckInDto.participantId} in session ${createCheckInDto.sessionId}`,
    );

    // Verify session exists and is open
    const session = await this.sessionsService.findOne(createCheckInDto.sessionId);
    if (!session.isOpen) {
      throw new ValidationException([
        { field: 'sessionId', message: 'Session is not open for check-ins' },
      ]);
    }

    // Verify participant exists
    await this.participantsService.findOne(createCheckInDto.participantId);

    // Check for existing check-in
    const existing = await this.checkInRepository.findByParticipantAndSession(
      createCheckInDto.participantId,
      createCheckInDto.sessionId,
    );

    if (existing) {
      throw new EntityExistsException(
        'CheckIn',
        'participant-session',
        `${createCheckInDto.participantId}-${createCheckInDto.sessionId}`,
      );
    }

    // Determine if check-in is late
    const checkInTime = new Date();
    const isLate = this.isCheckInLate(checkInTime, new Date(session.startTime));

    if (isLate) {
      this.logger.log(`Check-in is late (threshold: ${this.lateThresholdMinutes} min after session start)`);
    }

    const checkIn = await this.checkInRepository.create({
      ...createCheckInDto,
      participantId: new Types.ObjectId(createCheckInDto.participantId),
      sessionId: new Types.ObjectId(createCheckInDto.sessionId),
      method: createCheckInDto.method || CheckInMethod.MANUAL,
      checkInTime,
      isLate,
    });

    // Increment session check-in count
    await this.sessionsService.incrementCheckInCount(createCheckInDto.sessionId);

    this.logger.log(`Check-in created with ID: ${checkIn._id}`);
    return checkIn;
  }

  async checkInByQr(qrCheckInDto: QrCheckInDto): Promise<CheckInDocument> {
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
    return this.checkInRepository.deleteBySession(sessionId);
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
}
