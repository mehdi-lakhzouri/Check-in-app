import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories';
import { CheckIn, CheckInDocument } from '../schemas';
import { CheckInFilterDto } from '../dto';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class CheckInRepository extends BaseRepository<CheckInDocument> {
  constructor(
    @InjectModel(CheckIn.name) private checkInModel: Model<CheckInDocument>,
  ) {
    super(checkInModel);
  }

  async findWithFilters(
    filterDto: CheckInFilterDto,
  ): Promise<PaginatedResult<CheckInDocument>> {
    const filter: QueryFilter<CheckInDocument> = {};

    if (filterDto.method) {
      filter.method = filterDto.method;
    }

    if (filterDto.participantId) {
      filter.participantId = new Types.ObjectId(filterDto.participantId);
    }

    if (filterDto.sessionId) {
      filter.sessionId = new Types.ObjectId(filterDto.sessionId);
    }

    if (filterDto.checkInAfter || filterDto.checkInBefore) {
      filter.checkInTime = {};
      if (filterDto.checkInAfter) {
        filter.checkInTime.$gte = new Date(filterDto.checkInAfter);
      }
      if (filterDto.checkInBefore) {
        filter.checkInTime.$lte = new Date(filterDto.checkInBefore);
      }
    }

    return this.findWithPaginationAndPopulate(filter, filterDto);
  }

  private async findWithPaginationAndPopulate(
    filter: QueryFilter<CheckInDocument>,
    filterDto: CheckInFilterDto,
  ): Promise<PaginatedResult<CheckInDocument>> {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;
    const sortField = filterDto.sortBy || 'checkInTime';
    const sortOrder = filterDto.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.checkInModel
        .find(filter)
        .populate('participantId', 'name email organization qrCode')
        .populate('sessionId', 'name startTime endTime location')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.checkInModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByParticipantAndSession(
    participantId: string,
    sessionId: string,
  ): Promise<CheckInDocument | null> {
    return this.checkInModel
      .findOne({
        participantId: new Types.ObjectId(participantId),
        sessionId: new Types.ObjectId(sessionId),
      })
      .exec();
  }

  async findByParticipant(participantId: string): Promise<CheckInDocument[]> {
    return this.checkInModel
      .find({ participantId: new Types.ObjectId(participantId) })
      .populate('sessionId')
      .sort({ checkInTime: -1 })
      .exec();
  }

  async findBySession(sessionId: string): Promise<CheckInDocument[]> {
    return this.checkInModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('participantId')
      .sort({ checkInTime: -1 })
      .exec();
  }

  async findWithPopulate(id: string): Promise<CheckInDocument | null> {
    return this.checkInModel
      .findById(id)
      .populate('participantId')
      .populate('sessionId')
      .exec();
  }

  async findAllWithPopulate(
    filter: QueryFilter<CheckInDocument> = {} as QueryFilter<CheckInDocument>,
  ): Promise<CheckInDocument[]> {
    return this.checkInModel
      .find(filter)
      .populate('participantId')
      .populate('sessionId')
      .sort({ checkInTime: -1 })
      .exec();
  }

  async countBySession(sessionId: string): Promise<number> {
    return this.count({ sessionId: new Types.ObjectId(sessionId) });
  }

  async deleteBySession(sessionId: string): Promise<number> {
    return this.deleteMany({ sessionId: new Types.ObjectId(sessionId) });
  }

  async deleteByParticipant(participantId: string): Promise<number> {
    return this.deleteMany({ participantId: new Types.ObjectId(participantId) });
  }

  async getCheckInStats(sessionId?: string): Promise<{
    total: number;
    qr: number;
    manual: number;
  }> {
    const filter: QueryFilter<CheckInDocument> = sessionId
      ? { sessionId: new Types.ObjectId(sessionId) } as QueryFilter<CheckInDocument>
      : {} as QueryFilter<CheckInDocument>;

    const [total, qr, manual] = await Promise.all([
      this.count(filter),
      this.count({ ...filter, method: 'qr' }),
      this.count({ ...filter, method: 'manual' }),
    ]);

    return { total, qr, manual };
  }

  async getRecentCheckIns(limit = 10, sessionId?: string): Promise<CheckInDocument[]> {
    const filter: QueryFilter<CheckInDocument> = sessionId
      ? { sessionId: new Types.ObjectId(sessionId) } as QueryFilter<CheckInDocument>
      : {} as QueryFilter<CheckInDocument>;

    return this.checkInModel
      .find(filter)
      .populate('participantId')
      .populate('sessionId')
      .sort({ checkInTime: -1 })
      .limit(limit)
      .exec();
  }
}
