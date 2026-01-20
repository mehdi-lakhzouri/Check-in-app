import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories';
import { Registration, RegistrationDocument } from '../schemas';
import { RegistrationFilterDto } from '../dto';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class RegistrationRepository extends BaseRepository<RegistrationDocument> {
  constructor(
    @InjectModel(Registration.name)
    private registrationModel: Model<RegistrationDocument>,
  ) {
    super(registrationModel);
  }

  async findWithFilters(
    filterDto: RegistrationFilterDto,
  ): Promise<PaginatedResult<RegistrationDocument>> {
    const filter: QueryFilter<RegistrationDocument> = {};

    if (filterDto.status) {
      filter.status = filterDto.status;
    }

    if (filterDto.participantId) {
      filter.participantId = new Types.ObjectId(filterDto.participantId);
    }

    if (filterDto.sessionId) {
      filter.sessionId = new Types.ObjectId(filterDto.sessionId);
    }

    // Use custom pagination with populate
    return this.findWithPaginationAndPopulate(filter, filterDto);
  }

  /**
   * Find with pagination and populate participant/session
   */
  private async findWithPaginationAndPopulate(
    filter: QueryFilter<RegistrationDocument>,
    pagination: RegistrationFilterDto,
  ): Promise<PaginatedResult<RegistrationDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.registrationModel
        .find(filter)
        .populate('participantId')
        .populate('sessionId')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.registrationModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByParticipantAndSession(
    participantId: string,
    sessionId: string,
  ): Promise<RegistrationDocument | null> {
    return this.registrationModel
      .findOne({
        participantId: new Types.ObjectId(participantId),
        sessionId: new Types.ObjectId(sessionId),
      })
      .exec();
  }

  async findByParticipant(
    participantId: string,
  ): Promise<RegistrationDocument[]> {
    return this.registrationModel
      .find({ participantId: new Types.ObjectId(participantId) })
      .populate('sessionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findBySession(sessionId: string): Promise<RegistrationDocument[]> {
    return this.registrationModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('participantId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findWithPopulate(id: string): Promise<RegistrationDocument | null> {
    return this.registrationModel
      .findById(id)
      .populate('participantId')
      .populate('sessionId')
      .exec();
  }

  async findAllWithPopulate(
    filter: QueryFilter<RegistrationDocument>,
  ): Promise<RegistrationDocument[]> {
    return this.registrationModel
      .find(filter)
      .populate('participantId')
      .populate('sessionId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async countBySession(sessionId: string): Promise<number> {
    return this.count({ sessionId: new Types.ObjectId(sessionId) });
  }

  async deleteBySession(sessionId: string): Promise<number> {
    return this.deleteMany({ sessionId: new Types.ObjectId(sessionId) });
  }

  async deleteByParticipant(participantId: string): Promise<number> {
    return this.deleteMany({
      participantId: new Types.ObjectId(participantId),
    });
  }

  async getRegistrationStats(): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    todayRegistrations: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, confirmed, pending, cancelled, todayRegistrations] =
      await Promise.all([
        this.count({}),
        this.count({ status: 'confirmed' }),
        this.count({ status: 'pending' }),
        this.count({ status: 'cancelled' }),
        this.count({ createdAt: { $gte: today } }),
      ]);

    return {
      total,
      confirmed,
      pending,
      cancelled,
      todayRegistrations,
    };
  }
}
