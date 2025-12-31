import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories';
import { Participant, ParticipantDocument, ParticipantStatus } from '../schemas';
import { ParticipantFilterDto } from '../dto';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class ParticipantRepository extends BaseRepository<ParticipantDocument> {
  constructor(
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
  ) {
    super(participantModel);
  }

  async findByEmail(email: string): Promise<ParticipantDocument | null> {
    return this.participantModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByQrCode(qrCode: string): Promise<ParticipantDocument | null> {
    return this.participantModel.findOne({ qrCode }).exec();
  }

  async findWithFilters(
    filterDto: ParticipantFilterDto,
  ): Promise<PaginatedResult<ParticipantDocument>> {
    const filter: QueryFilter<ParticipantDocument> = {};

    if (filterDto.status) {
      filter.status = filterDto.status;
    }

    if (filterDto.isActive !== undefined) {
      filter.isActive = filterDto.isActive;
    }

    if (filterDto.organization) {
      filter.organization = { $regex: filterDto.organization, $options: 'i' };
    }

    if (filterDto.travelGrantApplied !== undefined) {
      filter.travelGrantApplied = filterDto.travelGrantApplied;
    }

    if (filterDto.travelGrantApproved !== undefined) {
      filter.travelGrantApproved = filterDto.travelGrantApproved;
    }

    return this.findWithPagination(filter, filterDto, ['name', 'email', 'organization']);
  }

  async findAmbassadors(): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ status: ParticipantStatus.AMBASSADOR })
      .sort({ ambassadorPoints: -1 })
      .exec();
  }

  async getAmbassadorLeaderboard(limit = 10): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ status: ParticipantStatus.AMBASSADOR })
      .sort({ ambassadorPoints: -1 })
      .limit(limit)
      .exec();
  }

  async addReferredParticipant(
    ambassadorId: string,
    participantId: string,
  ): Promise<ParticipantDocument | null> {
    return this.participantModel
      .findByIdAndUpdate(
        ambassadorId,
        { $addToSet: { referredParticipantIds: new Types.ObjectId(participantId) } },
        { new: true },
      )
      .exec();
  }

  async removeReferredParticipant(
    ambassadorId: string,
    participantId: string,
  ): Promise<ParticipantDocument | null> {
    return this.participantModel
      .findByIdAndUpdate(
        ambassadorId,
        { $pull: { referredParticipantIds: new Types.ObjectId(participantId) } },
        { new: true },
      )
      .exec();
  }

  async updateAmbassadorPoints(
    ambassadorId: string,
    points: number,
  ): Promise<ParticipantDocument | null> {
    return this.participantModel
      .findByIdAndUpdate(
        ambassadorId,
        { ambassadorPoints: points },
        { new: true },
      )
      .exec();
  }

  async getTravelGrantApplications(
    status?: boolean,
    organization?: string,
  ): Promise<ParticipantDocument[]> {
    const filter: QueryFilter<ParticipantDocument> = {
      travelGrantApplied: true,
    };

    if (status !== undefined) {
      filter.travelGrantApproved = status;
    }

    if (organization) {
      filter.organization = { $regex: organization, $options: 'i' };
    }

    return this.participantModel.find(filter).sort({ travelGrantAppliedAt: -1 }).exec();
  }

  async getTravelGrantStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [total, approved, rejected] = await Promise.all([
      this.count({ travelGrantApplied: true }),
      this.count({ travelGrantApplied: true, travelGrantApproved: true }),
      this.count({ travelGrantApplied: true, travelGrantApproved: false }),
    ]);

    return {
      total,
      pending: total - approved - rejected,
      approved,
      rejected,
    };
  }

  async getParticipantStats(): Promise<{
    total: number;
    active: number;
    ambassadors: number;
    travelGrant: number;
  }> {
    const [total, active, ambassadors, travelGrant] = await Promise.all([
      this.count({}),
      this.count({ isActive: true }),
      this.count({ status: ParticipantStatus.AMBASSADOR }),
      this.count({ status: ParticipantStatus.TRAVEL_GRANT }),
    ]);

    return { total, active, ambassadors, travelGrant };
  }

  async findByIds(ids: string[]): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .exec();
  }
}
