import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { RegistrationRepository } from '../repositories';
import { CreateRegistrationDto, UpdateRegistrationDto, RegistrationFilterDto } from '../dto';
import { RegistrationDocument } from '../schemas';
import { EntityNotFoundException, EntityExistsException } from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(private readonly registrationRepository: RegistrationRepository) {}

  async create(createRegistrationDto: CreateRegistrationDto): Promise<RegistrationDocument> {
    this.logger.log(
      `Creating registration for participant ${createRegistrationDto.participantId} in session ${createRegistrationDto.sessionId}`,
    );

    // Check for existing registration
    const existing = await this.registrationRepository.findByParticipantAndSession(
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

    this.logger.log(`Registration created with ID: ${registration._id}`);
    return registration;
  }

  async findAll(filterDto: RegistrationFilterDto): Promise<PaginatedResult<RegistrationDocument>> {
    this.logger.log(`Finding registrations with filters: ${JSON.stringify(filterDto)}`);
    return this.registrationRepository.findWithFilters(filterDto);
  }

  async findOne(id: string): Promise<RegistrationDocument> {
    const registration = await this.registrationRepository.findWithPopulate(id);

    if (!registration) {
      throw new EntityNotFoundException('Registration', id);
    }

    return registration;
  }

  async findByParticipant(participantId: string): Promise<RegistrationDocument[]> {
    return this.registrationRepository.findByParticipant(participantId);
  }

  async findBySession(sessionId: string): Promise<RegistrationDocument[]> {
    return this.registrationRepository.findBySession(sessionId);
  }

  async update(
    id: string,
    updateRegistrationDto: UpdateRegistrationDto,
  ): Promise<RegistrationDocument> {
    this.logger.log(`Updating registration: ${id}`);

    const registration = await this.registrationRepository.updateById(id, updateRegistrationDto);

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
    this.logger.log(`Deleting all registrations for participant: ${participantId}`);
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
