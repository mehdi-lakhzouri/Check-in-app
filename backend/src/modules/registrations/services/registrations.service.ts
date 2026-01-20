import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { RegistrationRepository } from '../repositories';
import {
  CreateRegistrationDto,
  UpdateRegistrationDto,
  RegistrationFilterDto,
} from '../dto';
import { RegistrationDocument, RegistrationStatus } from '../schemas';
import {
  EntityNotFoundException,
  EntityExistsException,
} from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';
import { PinoLoggerService, getCurrentRequestId } from '../../../common/logger';

@Injectable()
export class RegistrationsService {
  private readonly logger: PinoLoggerService;

  constructor(private readonly registrationRepository: RegistrationRepository) {
    this.logger = new PinoLoggerService();
    this.logger.setContext(RegistrationsService.name);
  }

  async create(
    createRegistrationDto: CreateRegistrationDto,
  ): Promise<RegistrationDocument> {
    this.logger.log('Creating registration', {
      participantId: createRegistrationDto.participantId,
      sessionId: createRegistrationDto.sessionId,
      reqId: getCurrentRequestId(),
    });

    // Check for existing registration
    const existing =
      await this.registrationRepository.findByParticipantAndSession(
        createRegistrationDto.participantId,
        createRegistrationDto.sessionId,
      );

    if (existing) {
      throw new EntityExistsException(
        'Registration',
        'participant-session',
        `${createRegistrationDto.participantId}-${createRegistrationDto.sessionId}`,
      );
    }

    const registration = await this.registrationRepository.create({
      ...createRegistrationDto,
      participantId: new Types.ObjectId(createRegistrationDto.participantId),
      sessionId: new Types.ObjectId(createRegistrationDto.sessionId),
    });

    this.logger.log('Registration created', {
      registrationId: registration._id,
      reqId: getCurrentRequestId(),
    });
    return registration;
  }

  async findAll(
    filterDto: RegistrationFilterDto,
  ): Promise<PaginatedResult<RegistrationDocument>> {
    this.logger.debug('Finding registrations', {
      filters: filterDto,
      reqId: getCurrentRequestId(),
    });
    return this.registrationRepository.findWithFilters(filterDto);
  }

  async findOne(id: string): Promise<RegistrationDocument> {
    const registration = await this.registrationRepository.findWithPopulate(id);

    if (!registration) {
      throw new EntityNotFoundException('Registration', id);
    }

    return registration;
  }

  async findByParticipant(
    participantId: string,
  ): Promise<RegistrationDocument[]> {
    return this.registrationRepository.findByParticipant(participantId);
  }

  async findBySession(sessionId: string): Promise<RegistrationDocument[]> {
    return this.registrationRepository.findBySession(sessionId);
  }

  /**
   * Find a registration by participant and session
   * Used to verify participant is registered for closed sessions
   */
  async findByParticipantAndSession(
    participantId: string,
    sessionId: string,
  ): Promise<RegistrationDocument | null> {
    return this.registrationRepository.findByParticipantAndSession(
      participantId,
      sessionId,
    );
  }

  /**
   * Check if a participant is registered and confirmed for a session
   */
  async isParticipantRegistered(
    participantId: string,
    sessionId: string,
  ): Promise<{
    isRegistered: boolean;
    status?: RegistrationStatus;
    registration?: RegistrationDocument;
  }> {
    const registration =
      await this.registrationRepository.findByParticipantAndSession(
        participantId,
        sessionId,
      );

    if (!registration) {
      return { isRegistered: false };
    }

    return {
      isRegistered: registration.status === RegistrationStatus.CONFIRMED,
      status: registration.status,
      registration,
    };
  }

  async update(
    id: string,
    updateRegistrationDto: UpdateRegistrationDto,
  ): Promise<RegistrationDocument> {
    this.logger.log(`Updating registration: ${id}`);

    const registration = await this.registrationRepository.updateById(
      id,
      updateRegistrationDto,
    );

    if (!registration) {
      throw new EntityNotFoundException('Registration', id);
    }

    this.logger.log(`Registration updated: ${id}`);
    return registration;
  }

  async remove(id: string): Promise<RegistrationDocument> {
    this.logger.log(`Deleting registration: ${id}`);

    const registration = await this.registrationRepository.deleteById(id);

    if (!registration) {
      throw new EntityNotFoundException('Registration', id);
    }

    this.logger.log(`Registration deleted: ${id}`);
    return registration;
  }

  async removeBySession(sessionId: string): Promise<number> {
    this.logger.log(`Deleting all registrations for session: ${sessionId}`);
    return this.registrationRepository.deleteBySession(sessionId);
  }

  async removeByParticipant(participantId: string): Promise<number> {
    this.logger.log(
      `Deleting all registrations for participant: ${participantId}`,
    );
    return this.registrationRepository.deleteByParticipant(participantId);
  }

  async countBySession(sessionId: string): Promise<number> {
    return this.registrationRepository.countBySession(sessionId);
  }

  async getStats(): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    todayRegistrations: number;
  }> {
    return this.registrationRepository.getRegistrationStats();
  }
}
