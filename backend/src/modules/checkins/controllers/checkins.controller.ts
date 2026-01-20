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
import {
  CreateCheckInDto,
  QrCheckInDto,
  CheckInFilterDto,
  VerifyQrDto,
  AcceptCheckInDto,
  DeclineCheckInDto,
  CheckInAttemptFilterDto,
} from '../dto';
import { CheckIn, CheckInAttempt } from '../schemas';
import { ParseMongoIdPipe } from '../../../common/pipes';
import {
  ApiPaginatedResponse,
  ApiStandardResponse,
} from '../../../common/decorators';

@ApiTags('checkins')
@Controller('checkin')
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  // ============================================================================
  // VERIFICATION & WORKFLOW ENDPOINTS
  // ============================================================================

  @Post('verify-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify participant registration status via QR code',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result with registration status and actions',
  })
  @ApiResponse({ status: 404, description: 'Participant or session not found' })
  async verifyQr(@Body() verifyDto: VerifyQrDto) {
    const result = await this.checkInsService.verifyQr(verifyDto);
    return {
      status: 'success',
      message: 'Participant verification complete',
      data: result,
    };
  }

  @Post('accept')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Accept and create check-in after verification' })
  @ApiStandardResponse(CheckIn, 'Check-in accepted successfully')
  @ApiResponse({ status: 400, description: 'Session not open or at capacity' })
  @ApiResponse({ status: 409, description: 'Already checked in' })
  async acceptCheckIn(@Body() acceptDto: AcceptCheckInDto) {
    const result = await this.checkInsService.acceptCheckIn(acceptDto);
    return {
      status: 'success',
      message: result.wasRegistered
        ? 'Check-in accepted successfully'
        : 'Check-in accepted (participant was not registered)',
      data: result.checkIn,
      capacityInfo: result.capacityInfo,
      wasRegistered: result.wasRegistered,
    };
  }

  @Post('decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline check-in and log the attempt' })
  @ApiStandardResponse(CheckInAttempt, 'Check-in declined and logged')
  @ApiResponse({ status: 404, description: 'Participant or session not found' })
  async declineCheckIn(@Body() declineDto: DeclineCheckInDto) {
    const result = await this.checkInsService.declineCheckIn(declineDto);
    return {
      status: 'success',
      message: 'Check-in declined and logged',
      data: result.attempt,
      participant: result.participant,
      session: result.session,
    };
  }

  @Get('attempts')
  @ApiOperation({
    summary: 'Get check-in attempts (declined/failed) for audit',
  })
  @ApiPaginatedResponse(CheckInAttempt, 'Check-in attempts retrieved')
  async getAttempts(@Query() filterDto: CheckInAttemptFilterDto) {
    const result = await this.checkInsService.getAttempts(filterDto);
    return {
      status: 'success',
      message: 'Check-in attempts retrieved',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('attempts/stats')
  @ApiOperation({ summary: 'Get check-in attempt statistics' })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Attempt statistics retrieved' })
  async getAttemptStats(@Query('sessionId') sessionId?: string) {
    const stats = await this.checkInsService.getAttemptStats(sessionId);
    return {
      status: 'success',
      message: 'Attempt statistics retrieved',
      data: stats,
    };
  }

  // ============================================================================
  // STANDARD CHECK-IN ENDPOINTS
  // ============================================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manual check-in a participant to a session' })
  @ApiStandardResponse(CheckIn, 'Check-in created successfully')
  @ApiResponse({
    status: 400,
    description: 'Validation error, session not open, or at capacity',
  })
  @ApiResponse({ status: 409, description: 'Already checked in' })
  async create(@Body() createCheckInDto: CreateCheckInDto) {
    const result = await this.checkInsService.create(createCheckInDto);
    return {
      status: 'success',
      message: 'Check-in created successfully',
      data: result.checkIn,
      capacityInfo: result.capacityInfo,
    };
  }

  @Post('qr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Check-in participant using QR code' })
  @ApiStandardResponse(CheckIn, 'QR check-in successful')
  @ApiResponse({
    status: 400,
    description: 'Validation error, session not open, or at capacity',
  })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  @ApiResponse({ status: 409, description: 'Already checked in' })
  async checkInByQr(@Body() qrCheckInDto: QrCheckInDto) {
    const result = await this.checkInsService.checkInByQr(qrCheckInDto);
    return {
      status: 'success',
      message: 'QR check-in successful',
      data: result.checkIn,
      capacityInfo: result.capacityInfo,
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
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Recent check-ins retrieved successfully',
  })
  async getRecent(
    @Query('limit') limit?: number,
    @Query('sessionId') sessionId?: string,
  ) {
    const checkIns = await this.checkInsService.getRecentCheckIns(
      limit,
      sessionId,
    );
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
    const isCheckedIn = await this.checkInsService.isCheckedIn(
      participantId,
      sessionId,
    );
    return {
      status: 'success',
      message: 'Check-in verification completed',
      data: { isCheckedIn },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a check-in by ID' })
  @ApiParam({
    name: 'id',
    description: 'Check-in ID',
    example: '507f1f77bcf86cd799439011',
  })
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
  @ApiParam({
    name: 'id',
    description: 'Check-in ID',
    example: '507f1f77bcf86cd799439011',
  })
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
