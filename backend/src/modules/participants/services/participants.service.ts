import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(private readonly participantRepository: ParticipantRepository) {}

  async create(createParticipantDto: CreateParticipantDto): Promise<ParticipantDocument> {
    this.logger.log(`Creating participant: ${createParticipantDto.email}`);

    // Check for existing email
    const existing = await this.participantRepository.findByEmail(createParticipantDto.email);
    if (existing) {
      throw new EntityExistsException('Participant', 'email', createParticipantDto.email);
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

  async findAll(filterDto: ParticipantFilterDto): Promise<PaginatedResult<ParticipantDocument>> {
    this.logger.log(`Finding participants with filters: ${JSON.stringify(filterDto)}`);
    return this.participantRepository.findWithFilters(filterDto);
  }

  async findOne(id: string): Promise<ParticipantDocument> {
    const participant = await this.participantRepository.findById(id);
    
    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }
    
    return participant;
  }

  async findByQrCode(qrCode: string): Promise<ParticipantDocument> {
    const participant = await this.participantRepository.findByQrCode(qrCode);
    
    if (!participant) {
      throw new EntityNotFoundException('Participant', `qrCode: ${qrCode}`);
    }
    
    return participant;
  }

  async findByEmail(email: string): Promise<ParticipantDocument | null> {
    return this.participantRepository.findByEmail(email);
  }

  async update(id: string, updateParticipantDto: UpdateParticipantDto): Promise<ParticipantDocument> {
    this.logger.log(`Updating participant: ${id}`);

    // Check for email uniqueness if email is being updated
    if (updateParticipantDto.email) {
      const existing = await this.participantRepository.findByEmail(updateParticipantDto.email);
      if (existing && existing._id.toString() !== id) {
        throw new EntityExistsException('Participant', 'email', updateParticipantDto.email);
      }
    }

    const participant = await this.participantRepository.updateById(id, updateParticipantDto);
    
    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }

    this.logger.log(`Participant updated: ${id}`);
    return participant;
  }

  async remove(id: string): Promise<ParticipantDocument> {
    this.logger.log(`Deleting participant: ${id}`);
    
    const participant = await this.participantRepository.deleteById(id);
    
    if (!participant) {
      throw new EntityNotFoundException('Participant', id);
    }

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

  async bulkCreate(
    participants: BulkParticipantItemDto[],
  ): Promise<{ created: number; failed: number; errors: Array<{ email: string; error: string }> }> {
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

    return {
      created,
      failed: errors.length,
      errors,
    };
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    ambassadors: number;
    travelGrant: number;
  }> {
    return this.participantRepository.getParticipantStats();
  }

  // Ambassador methods
  async getAmbassadorLeaderboard(limit = 10): Promise<ParticipantDocument[]> {
    return this.participantRepository.getAmbassadorLeaderboard(limit);
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
    const participant = await this.findOne(id);
    
    if (participant.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    // Points calculation: 10 points per referred participant
    const points = participant.referredParticipantIds.length * 10;
    
    const updated = await this.participantRepository.updateAmbassadorPoints(id, points);
    if (!updated) {
      throw new EntityNotFoundException('Participant', id);
    }
    return updated;
  }

  async addReferredParticipant(
    ambassadorId: string,
    participantId: string,
  ): Promise<ParticipantDocument> {
    const ambassador = await this.findOne(ambassadorId);
    
    if (ambassador.status !== ParticipantStatus.AMBASSADOR) {
      throw new ValidationException([
        { field: 'status', message: 'Participant is not an ambassador' },
      ]);
    }

    // Verify referred participant exists
    await this.findOne(participantId);

    const updated = await this.participantRepository.addReferredParticipant(
      ambassadorId,
      participantId,
    );

    if (!updated) {
      throw new EntityNotFoundException('Ambassador', ambassadorId);
    }

    // Recalculate points
    await this.calculateAmbassadorPoints(ambassadorId);

    return updated;
  }

  async removeReferredParticipant(
    ambassadorId: string,
    participantId: string,
  ): Promise<ParticipantDocument> {
    const updated = await this.participantRepository.removeReferredParticipant(
      ambassadorId,
      participantId,
    );

    if (!updated) {
      throw new EntityNotFoundException('Ambassador', ambassadorId);
    }

    // Recalculate points
    await this.calculateAmbassadorPoints(ambassadorId);

    return updated;
  }

  // Travel grant methods
  async getTravelGrantApplications(
    status?: boolean,
    organization?: string,
  ): Promise<ParticipantDocument[]> {
    return this.participantRepository.getTravelGrantApplications(status, organization);
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
        { field: 'travelGrant', message: qualification.reason || 'Not qualified for travel grant' },
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

  async decideTravelGrant(id: string, approved: boolean): Promise<ParticipantDocument> {
    const participant = await this.findOne(id);

    if (!participant.travelGrantApplied) {
      throw new ValidationException([
        { field: 'travelGrant', message: 'No travel grant application found' },
      ]);
    }

    const updated = await this.participantRepository.updateById(id, {
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
}
