import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories';
import {
  Participant,
  ParticipantDocument,
  ParticipantStatus,
} from '../schemas';
import { ParticipantFilterDto } from '../dto';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class ParticipantRepository extends BaseRepository<ParticipantDocument> {
  constructor(
    @InjectModel(Participant.name)
    private participantModel: Model<ParticipantDocument>,
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

    return this.findWithPagination(filter, filterDto, [
      'name',
      'email',
      'organization',
    ]);
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
        {
          $addToSet: {
            referredParticipantIds: new Types.ObjectId(participantId),
          },
        },
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
        {
          $pull: { referredParticipantIds: new Types.ObjectId(participantId) },
        },
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

    return this.participantModel
      .find(filter)
      .sort({ travelGrantAppliedAt: -1 })
      .exec();
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

  async findByOrganization(
    organization: string,
  ): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ organization: { $regex: `^${organization}$`, $options: 'i' } })
      .sort({ name: 1 })
      .exec();
  }

  async searchAmbassadors(
    search?: string,
    sortBy: string = 'ambassadorPoints',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<ParticipantDocument>> {
    const filter: QueryFilter<ParticipantDocument> = {
      status: ParticipantStatus.AMBASSADOR,
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.participantModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async searchTravelGrants(
    search?: string,
    status?: 'pending' | 'approved' | 'rejected',
    sortBy: string = 'travelGrantAppliedAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<ParticipantDocument>> {
    const filter: QueryFilter<ParticipantDocument> = {
      status: ParticipantStatus.TRAVEL_GRANT,
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'pending') {
      filter.travelGrantApplied = true;
      filter.travelGrantApproved = null;
    } else if (status === 'approved') {
      filter.travelGrantApproved = true;
    } else if (status === 'rejected') {
      filter.travelGrantApproved = false;
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.participantModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findByStatus(
    status: ParticipantStatus,
  ): Promise<ParticipantDocument[]> {
    return this.participantModel.find({ status }).sort({ name: 1 }).exec();
  }

  async findAllTravelGrantApplicants(): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ status: ParticipantStatus.TRAVEL_GRANT })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all participants with the same organization (excluding the ambassador)
   * Used for automatic referral calculation
   */
  async findOrganizationMembers(
    organization: string,
    excludeId: string,
  ): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({
        organization: { $regex: `^${organization}$`, $options: 'i' },
        _id: { $ne: new Types.ObjectId(excludeId) },
        status: { $ne: ParticipantStatus.AMBASSADOR }, // Exclude other ambassadors
      })
      .exec();
  }

  /**
   * Remove a participant from all ambassador referral lists
   * Used when deleting a participant
   */
  async removeParticipantFromAllReferrals(
    participantId: string,
  ): Promise<void> {
    await this.participantModel
      .updateMany(
        { referredParticipantIds: new Types.ObjectId(participantId) },
        {
          $pull: { referredParticipantIds: new Types.ObjectId(participantId) },
        },
      )
      .exec();
  }

  /**
   * Set referral list for an ambassador (replace entire list)
   * Used for auto-sync based on organization
   */
  async setReferredParticipants(
    ambassadorId: string,
    participantIds: string[],
  ): Promise<ParticipantDocument | null> {
    return this.participantModel
      .findByIdAndUpdate(
        ambassadorId,
        {
          referredParticipantIds: participantIds.map(
            (id) => new Types.ObjectId(id),
          ),
        },
        { new: true },
      )
      .exec();
  }
}
