import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SessionsService } from '../services';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionFilterDto,
  AssignParticipantsDto,
  BulkCreateSessionsDto,
} from '../dto';
import { Session } from '../schemas';
import { ParseMongoIdPipe } from '../../../common/pipes';
import {
  ApiPaginatedResponse,
  ApiStandardResponse,
} from '../../../common/decorators';
import { RegistrationsService } from '../../registrations/services';
import { CheckInsService } from '../../checkins/services';

@ApiTags('sessions')
@Controller('sessions')
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    @Inject(forwardRef(() => RegistrationsService))
    private readonly registrationsService: RegistrationsService,
    @Inject(forwardRef(() => CheckInsService))
    private readonly checkInsService: CheckInsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new session' })
  @ApiStandardResponse(Session, 'Session created successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async create(@Body() createSessionDto: CreateSessionDto) {
    const session = await this.sessionsService.create(createSessionDto);
    return {
      status: 'success',
      message: 'Session created successfully',
      data: session,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions with pagination and filtering' })
  @ApiPaginatedResponse(Session, 'Sessions retrieved successfully')
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async findAll(@Query() filterDto: SessionFilterDto) {
    const result = await this.sessionsService.findAll(filterDto);
    return {
      status: 'success',
      message: 'Sessions retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats() {
    const stats = await this.sessionsService.getStats();
    return {
      status: 'success',
      message: 'Session statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming sessions' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Upcoming sessions retrieved successfully',
  })
  async getUpcoming(@Query('limit') limit?: number) {
    const sessions = await this.sessionsService.getUpcoming(limit);
    return {
      status: 'success',
      message: 'Upcoming sessions retrieved successfully',
      data: sessions,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Session, 'Session retrieved successfully')
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOne(@Param('id', ParseMongoIdPipe) id: string) {
    const session = await this.sessionsService.findOne(id);
    return {
      status: 'success',
      message: 'Session retrieved successfully',
      data: session,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Session, 'Session updated successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    const session = await this.sessionsService.update(id, updateSessionDto);
    return {
      status: 'success',
      message: 'Session updated successfully',
      data: session,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Session, 'Session deleted successfully')
  @ApiResponse({ status: 404, description: 'Session not found' })
  async remove(@Param('id', ParseMongoIdPipe) id: string) {
    const session = await this.sessionsService.remove(id);
    return {
      status: 'success',
      message: 'Session deleted successfully',
      data: session,
    };
  }

  @Patch(':id/toggle-open')
  @ApiOperation({ summary: 'Toggle session open status' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({ name: 'isOpen', required: true, type: Boolean })
  @ApiStandardResponse(Session, 'Session status updated successfully')
  @ApiResponse({ status: 404, description: 'Session not found' })
  async toggleOpen(
    @Param('id', ParseMongoIdPipe) id: string,
    @Query('isOpen') isOpen: boolean,
  ) {
    const session = await this.sessionsService.toggleOpen(id, isOpen);
    return {
      status: 'success',
      message: 'Session status updated successfully',
      data: session,
    };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create multiple sessions at once' })
  @ApiResponse({
    status: 201,
    description: 'Bulk operation completed',
    schema: {
      properties: {
        status: { type: 'string', example: 'success' },
        message: {
          type: 'string',
          example: 'Bulk create completed: 5 created, 1 failed',
        },
        data: {
          type: 'object',
          properties: {
            success: { type: 'number', example: 5 },
            failed: { type: 'number', example: 1 },
            created: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number' },
                  name: { type: 'string' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreateSessionsDto) {
    const result = await this.sessionsService.bulkCreate(bulkCreateDto);
    return {
      status: 'success',
      message: `Bulk create completed: ${result.success} created, ${result.failed} failed`,
      data: result,
    };
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get all participants registered for a session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Session participants retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionParticipants(@Param('id', ParseMongoIdPipe) id: string) {
    // Verify session exists
    await this.sessionsService.findOne(id);

    // Get registrations for session with populated participant data
    const registrations = await this.registrationsService.findBySession(id);

    // Extract participant data from registrations
    const participants = registrations
      .filter((r) => r.participantId)
      .map((r) => r.participantId);

    return {
      status: 'success',
      message: 'Session participants retrieved successfully',
      data: participants,
    };
  }

  @Get(':id/checkins')
  @ApiOperation({ summary: 'Get all check-ins for a session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Session check-ins retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionCheckIns(@Param('id', ParseMongoIdPipe) id: string) {
    // Verify session exists
    await this.sessionsService.findOne(id);

    // Get check-ins for session
    const checkIns = await this.checkInsService.findBySession(id);

    return {
      status: 'success',
      message: 'Session check-ins retrieved successfully',
      data: checkIns,
    };
  }
}
