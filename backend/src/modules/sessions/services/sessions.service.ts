import { Injectable, Logger } from '@nestjs/common';
import { SessionRepository } from '../repositories';
import { CreateSessionDto, UpdateSessionDto, SessionFilterDto, AssignParticipantsDto, BulkCreateSessionsDto, BulkCreateResult } from '../dto';
import { SessionDocument } from '../schemas';
import { EntityNotFoundException, ValidationException } from '../../../common/exceptions';
import { PaginatedResult } from '../../../common/dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly sessionRepository: SessionRepository) {}

  async create(createSessionDto: CreateSessionDto): Promise<SessionDocument> {
    this.logger.log(`Creating session: ${createSessionDto.name}`);
    
    // Validate dates
    const startTime = new Date(createSessionDto.startTime);
    const endTime = new Date(createSessionDto.endTime);

    if (endTime <= startTime) {
      throw new ValidationException([
        { field: 'endTime', message: 'End time must be after start time' },
      ]);
    }

    const session = await this.sessionRepository.create({
      ...createSessionDto,
      startTime,
      endTime,
    });

    this.logger.log(`Session created with ID: ${session._id}`);
    return session;
  }

  async findAll(filterDto: SessionFilterDto): Promise<PaginatedResult<SessionDocument>> {
    this.logger.log(`Finding sessions with filters: ${JSON.stringify(filterDto)}`);
    return this.sessionRepository.findWithFilters(filterDto);
  }

  async findOne(id: string): Promise<SessionDocument> {
    const session = await this.sessionRepository.findById(id);
    
    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }
    
    return session;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto): Promise<SessionDocument> {
    this.logger.log(`Updating session: ${id}`);

    // Validate dates if both are provided
    if (updateSessionDto.startTime && updateSessionDto.endTime) {
      const startTime = new Date(updateSessionDto.startTime);
      const endTime = new Date(updateSessionDto.endTime);

      if (endTime <= startTime) {
        throw new ValidationException([
          { field: 'endTime', message: 'End time must be after start time' },
        ]);
      }
    }

    const updateData: Record<string, any> = {};
    
    if (updateSessionDto.name !== undefined) updateData.name = updateSessionDto.name;
    if (updateSessionDto.description !== undefined) updateData.description = updateSessionDto.description;
    if (updateSessionDto.location !== undefined) updateData.location = updateSessionDto.location;
    if (updateSessionDto.isOpen !== undefined) updateData.isOpen = updateSessionDto.isOpen;
    if (updateSessionDto.capacity !== undefined) updateData.capacity = updateSessionDto.capacity;
    if (updateSessionDto.startTime) updateData.startTime = new Date(updateSessionDto.startTime);
    if (updateSessionDto.endTime) updateData.endTime = new Date(updateSessionDto.endTime);

    const session = await this.sessionRepository.updateById(id, updateData);
    
    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    this.logger.log(`Session updated: ${id}`);
    return session;
  }

  async remove(id: string): Promise<SessionDocument> {
    this.logger.log(`Deleting session: ${id}`);
    
    const session = await this.sessionRepository.deleteById(id);
    
    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    this.logger.log(`Session deleted: ${id}`);
    return session;
  }

  async toggleOpen(id: string, isOpen: boolean): Promise<SessionDocument> {
    this.logger.log(`Toggling session ${id} open status to: ${isOpen}`);
    
    const session = await this.sessionRepository.updateById(id, { isOpen });
    
    if (!session) {
      throw new EntityNotFoundException('Session', id);
    }

    return session;
  }

  async getUpcoming(limit = 5): Promise<SessionDocument[]> {
    return this.sessionRepository.findUpcoming(limit);
  }

  async getStats(): Promise<{
    total: number;
    open: number;
    upcoming: number;
    past: number;
  }> {
    return this.sessionRepository.getSessionStats();
  }

  async incrementCheckInCount(sessionId: string): Promise<void> {
    await this.sessionRepository.incrementCheckInCount(sessionId);
  }

  async decrementCheckInCount(sessionId: string): Promise<void> {
    await this.sessionRepository.decrementCheckInCount(sessionId);
  }

  /**
   * Bulk create multiple sessions at once
   * Returns detailed results including successes and failures
   */
  async bulkCreate(bulkDto: BulkCreateSessionsDto): Promise<BulkCreateResult> {
    this.logger.log(`Bulk creating ${bulkDto.sessions.length} sessions`);

    const result: BulkCreateResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    for (let i = 0; i < bulkDto.sessions.length; i++) {
      const sessionDto = bulkDto.sessions[i];
      
      try {
        // Validate dates
        const startTime = new Date(sessionDto.startTime);
        const endTime = new Date(sessionDto.endTime);

        if (endTime <= startTime) {
          result.failed++;
          result.errors.push({
            index: i,
            name: sessionDto.name,
            error: 'End time must be after start time',
          });
          continue;
        }

        const session = await this.sessionRepository.create({
          ...sessionDto,
          startTime,
          endTime,
        });

        result.success++;
        result.created.push({
          _id: session._id.toString(),
          name: session.name,
        });

        this.logger.log(`Bulk created session: ${session.name}`);
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          name: sessionDto.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.error(`Failed to create session ${sessionDto.name}: ${error}`);
      }
    }

    this.logger.log(`Bulk create completed: ${result.success} success, ${result.failed} failed`);
    return result;
  }
}
