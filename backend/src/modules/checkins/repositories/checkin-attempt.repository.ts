import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories';
import {
  CheckInAttempt,
  CheckInAttemptDocument,
  AttemptStatus,
} from '../schemas';
import { CheckInAttemptFilterDto } from '../dto';
import { PaginatedResult } from '../../../common/dto';
import { createSafeSortObject } from '../../../common/utils';

@Injectable()
export class CheckInAttemptRepository extends BaseRepository<CheckInAttemptDocument> {
  constructor(
    @InjectModel(CheckInAttempt.name)
    private attemptModel: Model<CheckInAttemptDocument>,
  ) {
    super(attemptModel);
  }

  async findWithFilters(
    filterDto: CheckInAttemptFilterDto,
  ): Promise<PaginatedResult<CheckInAttemptDocument>> {
    const filter: QueryFilter<CheckInAttemptDocument> = {};

    if (filterDto.status) {
      filter.status = filterDto.status;
    }

    if (filterDto.participantId) {
      filter.participantId = new Types.ObjectId(filterDto.participantId);
    }

    if (filterDto.sessionId) {
      filter.sessionId = new Types.ObjectId(filterDto.sessionId);
    }

    return this.findWithPaginationAndPopulate(filter, filterDto);
  }

  private async findWithPaginationAndPopulate(
    filter: QueryFilter<CheckInAttemptDocument>,
    filterDto: CheckInAttemptFilterDto,
  ): Promise<PaginatedResult<CheckInAttemptDocument>> {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    // Validate sort field to prevent Remote Property Injection (CodeQL: js/remote-property-injection)
    const safeSort = createSafeSortObject(filterDto.sortBy, filterDto.sortOrder, 'checkInAttempt', 'attemptTime');

    const [data, total] = await Promise.all([
      this.attemptModel
        .find(filter)
        .populate('participantId', 'name email organization qrCode')
        .populate('sessionId', 'name startTime endTime location')
        .sort(safeSort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.attemptModel.countDocuments(filter).exec(),
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
  ): Promise<CheckInAttemptDocument[]> {
    return this.attemptModel
      .find({
        participantId: new Types.ObjectId(participantId),
        sessionId: new Types.ObjectId(sessionId),
      })
      .sort({ attemptTime: -1 })
      .exec();
  }

  async findBySession(sessionId: string): Promise<CheckInAttemptDocument[]> {
    return this.attemptModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('participantId')
      .sort({ attemptTime: -1 })
      .exec();
  }

  async countBySession(sessionId: string): Promise<number> {
    return this.count({ sessionId: new Types.ObjectId(sessionId) });
  }

  async countBySessionAndStatus(
    sessionId: string,
    status: AttemptStatus,
  ): Promise<number> {
    return this.count({
      sessionId: new Types.ObjectId(sessionId),
      status,
    });
  }

  async getRecentAttempts(
    limit = 10,
    sessionId?: string,
  ): Promise<CheckInAttemptDocument[]> {
    const filter: QueryFilter<CheckInAttemptDocument> = sessionId
      ? ({
          sessionId: new Types.ObjectId(sessionId),
        } as QueryFilter<CheckInAttemptDocument>)
      : ({} as QueryFilter<CheckInAttemptDocument>);

    return this.attemptModel
      .find(filter)
      .populate('participantId', 'name email organization qrCode')
      .populate('sessionId', 'name')
      .sort({ attemptTime: -1 })
      .limit(limit)
      .exec();
  }

  async getAttemptStats(sessionId?: string): Promise<{
    total: number;
    declined: number;
    failed: number;
  }> {
    const filter: QueryFilter<CheckInAttemptDocument> = sessionId
      ? ({
          sessionId: new Types.ObjectId(sessionId),
        } as QueryFilter<CheckInAttemptDocument>)
      : ({} as QueryFilter<CheckInAttemptDocument>);

    const results = await this.attemptModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: 0,
      declined: 0,
      failed: 0,
    };

    for (const result of results) {
      if (result._id === AttemptStatus.DECLINED) {
        stats.declined = result.count;
      } else if (result._id === AttemptStatus.FAILED) {
        stats.failed = result.count;
      }
      stats.total += result.count;
    }

    return stats;
  }
}
