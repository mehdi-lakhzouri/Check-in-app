import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseRepository } from '../../../common/repositories';
import { Session, SessionDocument } from '../schemas';
import { SessionFilterDto } from '../dto';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class SessionRepository extends BaseRepository<SessionDocument> {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {
    super(sessionModel);
  }

  async findWithFilters(
    filterDto: SessionFilterDto,
  ): Promise<PaginatedResult<SessionDocument>> {
    const filter: QueryFilter<SessionDocument> = {};

    if (filterDto.isOpen !== undefined) {
      filter.isOpen = filterDto.isOpen;
    }

    if (filterDto.location) {
      filter.location = { $regex: filterDto.location, $options: 'i' };
    }

    if (filterDto.startAfter || filterDto.startBefore) {
      filter.startTime = {};
      if (filterDto.startAfter) {
        filter.startTime.$gte = new Date(filterDto.startAfter);
      }
      if (filterDto.startBefore) {
        filter.startTime.$lte = new Date(filterDto.startBefore);
      }
    }

    return this.findWithPagination(filter, filterDto, ['name', 'description', 'location']);
  }

  async findUpcoming(limit = 5): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({
        startTime: { $gte: new Date() },
        isOpen: true,
      })
      .sort({ startTime: 1 })
      .limit(limit)
      .exec();
  }

  async incrementCheckInCount(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { $inc: { checkInsCount: 1 } },
    );
  }

  async decrementCheckInCount(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { $inc: { checkInsCount: -1 } },
    );
  }

  async resetCheckInCount(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { $set: { checkInsCount: 0 } },
    );
  }

  async getSessionStats(): Promise<{
    total: number;
    open: number;
    upcoming: number;
    past: number;
  }> {
    const now = new Date();
    const [total, open, upcoming, past] = await Promise.all([
      this.count({}),
      this.count({ isOpen: true }),
      this.count({ startTime: { $gt: now } }),
      this.count({ endTime: { $lt: now } }),
    ]);

    return { total, open, upcoming, past };
  }
}
