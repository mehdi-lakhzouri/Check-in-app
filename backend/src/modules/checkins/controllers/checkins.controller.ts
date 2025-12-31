import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CheckInsService } from '../services';
import { CreateCheckInDto, QrCheckInDto, CheckInFilterDto } from '../dto';
import { CheckIn } from '../schemas';
import { ParseMongoIdPipe } from '../../../common/pipes';
import { ApiPaginatedResponse, ApiStandardResponse } from '../../../common/decorators';

@ApiTags('checkins')
@Controller('checkin')
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manual check-in a participant to a session' })
  @ApiStandardResponse(CheckIn, 'Check-in created successfully')
  @ApiResponse({ status: 400, description: 'Validation error or session not open' })
  @ApiResponse({ status: 409, description: 'Already checked in' })
  async create(@Body() createCheckInDto: CreateCheckInDto) {
    const checkIn = await this.checkInsService.create(createCheckInDto);
    return {
      status: 'success',
      message: 'Check-in created successfully',
      data: checkIn,
    };
  }

  @Post('qr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Check-in participant using QR code' })
  @ApiStandardResponse(CheckIn, 'QR check-in successful')
  @ApiResponse({ status: 400, description: 'Validation error or session not open' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  @ApiResponse({ status: 409, description: 'Already checked in' })
  async checkInByQr(@Body() qrCheckInDto: QrCheckInDto) {
    const checkIn = await this.checkInsService.checkInByQr(qrCheckInDto);
    return {
      status: 'success',
      message: 'QR check-in successful',
      data: checkIn,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all check-ins with pagination and filtering' })
  @ApiPaginatedResponse(CheckIn, 'Check-ins retrieved successfully')
  async findAll(@Query() filterDto: CheckInFilterDto) {
    const result = await this.checkInsService.findAll(filterDto);
    return {
      status: 'success',
      message: 'Check-ins retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get check-in statistics' })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('sessionId') sessionId?: string) {
    const stats = await this.checkInsService.getStats(sessionId);
    return {
      status: 'success',
      message: 'Check-in statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent check-ins' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Recent check-ins retrieved successfully' })
  async getRecent(
    @Query('limit') limit?: number,
    @Query('sessionId') sessionId?: string,
  ) {
    const checkIns = await this.checkInsService.getRecentCheckIns(limit, sessionId);
    return {
      status: 'success',
      message: 'Recent check-ins retrieved successfully',
      data: checkIns,
    };
  }

  @Get('verify/:participantId/:sessionId')
  @ApiOperation({ summary: 'Verify if participant is checked in to a session' })
  @ApiParam({ name: 'participantId', description: 'Participant ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyCheckIn(
    @Param('participantId', ParseMongoIdPipe) participantId: string,
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
  ) {
    const isCheckedIn = await this.checkInsService.isCheckedIn(participantId, sessionId);
    return {
      status: 'success',
      message: 'Check-in verification completed',
      data: { isCheckedIn },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a check-in by ID' })
  @ApiParam({ name: 'id', description: 'Check-in ID', example: '507f1f77bcf86cd799439011' })
  @ApiStandardResponse(CheckIn, 'Check-in retrieved successfully')
  @ApiResponse({ status: 404, description: 'Check-in not found' })
  async findOne(@Param('id', ParseMongoIdPipe) id: string) {
    const checkIn = await this.checkInsService.findOne(id);
    return {
      status: 'success',
      message: 'Check-in retrieved successfully',
      data: checkIn,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/undo a check-in' })
  @ApiParam({ name: 'id', description: 'Check-in ID', example: '507f1f77bcf86cd799439011' })
  @ApiStandardResponse(CheckIn, 'Check-in deleted successfully')
  @ApiResponse({ status: 404, description: 'Check-in not found' })
  async remove(@Param('id', ParseMongoIdPipe) id: string) {
    const checkIn = await this.checkInsService.remove(id);
    return {
      status: 'success',
      message: 'Check-in deleted successfully',
      data: checkIn,
    };
  }
}
