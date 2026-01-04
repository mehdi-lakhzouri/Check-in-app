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

  /**
   * Atomically increment check-in count with capacity validation
   * Returns the updated session if successful, null if capacity is reached
   * This prevents race conditions by using MongoDB's atomic operations
   */
  async incrementCheckInCountWithCapacity(sessionId: string): Promise<SessionDocument | null> {
    // Use findOneAndUpdate with conditions to atomically check capacity and increment
    // The condition ensures we only increment if:
    // 1. capacity is 0 (unlimited) OR
    // 2. capacity is not enforced OR
    // 3. checkInsCount is less than capacity
    const result = await this.sessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        $or: [
          { capacity: 0 },                    // Unlimited capacity
          { capacity: { $exists: false } },   // No capacity set
          { capacityEnforced: false },        // Capacity not enforced (overflow allowed)
          { $expr: { $lt: ['$checkInsCount', '$capacity'] } }  // Under capacity
        ]
      },
      { $inc: { checkInsCount: 1 } },
      { new: true }
    ).exec();
    
    return result;
  }

  /**
   * Get remaining capacity for a session
   * Returns -1 for unlimited capacity
   */
  async getRemainingCapacity(sessionId: string): Promise<number> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) return 0;
    if (!session.capacity || session.capacity === 0) return -1; // Unlimited
    return Math.max(0, session.capacity - session.checkInsCount);
  }

  /**
   * Get capacity status for a session
   */
  async getCapacityStatus(sessionId: string): Promise<{
    capacity: number;
    checkInsCount: number;
    remaining: number;
    percentFull: number;
    isAtCapacity: boolean;
    isNearCapacity: boolean; // 80% or more
    capacityEnforced: boolean;
  }> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new Error('Session not found');
    }
    
    const capacity = session.capacity || 0;
    const checkInsCount = session.checkInsCount;
    const isUnlimited = capacity === 0;
    const remaining = isUnlimited ? -1 : Math.max(0, capacity - checkInsCount);
    const percentFull = isUnlimited ? 0 : Math.round((checkInsCount / capacity) * 100);
    
    return {
      capacity,
      checkInsCount,
      remaining,
      percentFull,
      isAtCapacity: !isUnlimited && checkInsCount >= capacity,
      isNearCapacity: !isUnlimited && percentFull >= 80,
      capacityEnforced: session.capacityEnforced ?? true,
    };
  }

  /**
   * Reconcile checkInsCount with actual check-ins count from database
   * Used by background job to fix any inconsistencies
   */
  async reconcileCheckInCount(sessionId: string, actualCount: number): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { $set: { checkInsCount: actualCount } },
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
