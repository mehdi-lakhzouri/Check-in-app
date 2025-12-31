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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ParticipantsService } from '../services';
import {
  CreateParticipantDto,
  UpdateParticipantDto,
  ParticipantFilterDto,
  BulkCreateParticipantsDto,
  AddReferredParticipantDto,
  TravelGrantDecisionDto,
} from '../dto';
import { Participant } from '../schemas';
import { ParseMongoIdPipe } from '../../../common/pipes';
import { ApiPaginatedResponse, ApiStandardResponse } from '../../../common/decorators';

@ApiTags('participants')
@Controller('participants')
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new participant' })
  @ApiStandardResponse(Participant, 'Participant created successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createParticipantDto: CreateParticipantDto) {
    const participant = await this.participantsService.create(createParticipantDto);
    return {
      status: 'success',
      message: 'Participant created successfully',
      data: participant,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all participants with pagination and filtering' })
  @ApiPaginatedResponse(Participant, 'Participants retrieved successfully')
  async findAll(@Query() filterDto: ParticipantFilterDto) {
    const result = await this.participantsService.findAll(filterDto);
    return {
      status: 'success',
      message: 'Participants retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('generate-qr')
  @ApiOperation({ summary: 'Generate a new unique QR code' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  async generateQr() {
    const qrData = await this.participantsService.generateQrCode();
    return {
      status: 'success',
      message: 'QR code generated successfully',
      data: qrData,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get participant statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    const stats = await this.participantsService.getStats();
    return {
      status: 'success',
      message: 'Participant statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Get participant by QR code' })
  @ApiParam({ name: 'qrCode', description: 'QR code string', example: 'QR-ABC123XYZ' })
  @ApiStandardResponse(Participant, 'Participant retrieved successfully')
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async findByQrCode(@Param('qrCode') qrCode: string) {
    const participant = await this.participantsService.findByQrCode(qrCode);
    return {
      status: 'success',
      message: 'Participant retrieved successfully',
      data: participant,
    };
  }

  @Get('ambassadors/leaderboard')
  @ApiOperation({ summary: 'Get ambassador leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getAmbassadorLeaderboard(@Query('limit') limit?: number) {
    const ambassadors = await this.participantsService.getAmbassadorLeaderboard(limit);
    return {
      status: 'success',
      message: 'Ambassador leaderboard retrieved successfully',
      data: ambassadors,
    };
  }

  @Get('travel-grants/applications')
  @ApiOperation({ summary: 'Get travel grant applications' })
  @ApiQuery({ name: 'status', required: false, type: Boolean })
  @ApiQuery({ name: 'organization', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  async getTravelGrantApplications(
    @Query('status') status?: boolean,
    @Query('organization') organization?: string,
  ) {
    const applications = await this.participantsService.getTravelGrantApplications(
      status,
      organization,
    );
    return {
      status: 'success',
      message: 'Travel grant applications retrieved successfully',
      data: applications,
    };
  }

  @Get('travel-grants/stats')
  @ApiOperation({ summary: 'Get travel grant statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getTravelGrantStats() {
    const stats = await this.participantsService.getTravelGrantStats();
    return {
      status: 'success',
      message: 'Travel grant statistics retrieved successfully',
      data: stats,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a participant by ID' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiStandardResponse(Participant, 'Participant retrieved successfully')
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async findOne(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.findOne(id);
    return {
      status: 'success',
      message: 'Participant retrieved successfully',
      data: participant,
    };
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get detailed participant information' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Participant details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async getDetails(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.findOne(id);
    const qrDataUrl = await this.participantsService.getQrCodeDataUrl(participant.qrCode);
    return {
      status: 'success',
      message: 'Participant details retrieved successfully',
      data: {
        ...participant.toObject(),
        qrDataUrl,
      },
    };
  }

  @Get(':id/ambassador/activity')
  @ApiOperation({ summary: 'Get ambassador activity' })
  @ApiParam({ name: 'id', description: 'Ambassador ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Ambassador activity retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Participant is not an ambassador' })
  async getAmbassadorActivity(@Param('id', ParseMongoIdPipe) id: string) {
    const activity = await this.participantsService.getAmbassadorActivity(id);
    return {
      status: 'success',
      message: 'Ambassador activity retrieved successfully',
      data: activity,
    };
  }

  @Get(':id/travel-grant/qualification')
  @ApiOperation({ summary: 'Check travel grant qualification' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Qualification status retrieved successfully' })
  async checkTravelGrantQualification(@Param('id', ParseMongoIdPipe) id: string) {
    const qualification = await this.participantsService.checkTravelGrantQualification(id);
    return {
      status: 'success',
      message: 'Travel grant qualification status retrieved successfully',
      data: qualification,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a participant' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiStandardResponse(Participant, 'Participant updated successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ) {
    const participant = await this.participantsService.update(id, updateParticipantDto);
    return {
      status: 'success',
      message: 'Participant updated successfully',
      data: participant,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a participant' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiStandardResponse(Participant, 'Participant deleted successfully')
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async remove(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.remove(id);
    return {
      status: 'success',
      message: 'Participant deleted successfully',
      data: participant,
    };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create participants' })
  @ApiResponse({ status: 201, description: 'Bulk creation completed' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreateParticipantsDto) {
    const result = await this.participantsService.bulkCreate(bulkCreateDto.participants);
    return {
      status: 'success',
      message: `Created ${result.created} participants, ${result.failed} failed`,
      data: result,
    };
  }

  @Post(':id/ambassador/calculate-points')
  @ApiOperation({ summary: 'Calculate ambassador points' })
  @ApiParam({ name: 'id', description: 'Ambassador ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Points calculated successfully' })
  async calculateAmbassadorPoints(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.calculateAmbassadorPoints(id);
    return {
      status: 'success',
      message: 'Ambassador points calculated successfully',
      data: participant,
    };
  }

  @Post(':id/ambassador/add-referred')
  @ApiOperation({ summary: 'Add referred participant to ambassador' })
  @ApiParam({ name: 'id', description: 'Ambassador ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Referred participant added successfully' })
  async addReferredParticipant(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: AddReferredParticipantDto,
  ) {
    const participant = await this.participantsService.addReferredParticipant(
      id,
      dto.participantId,
    );
    return {
      status: 'success',
      message: 'Referred participant added successfully',
      data: participant,
    };
  }

  @Delete(':id/ambassador/remove-referred/:participantId')
  @ApiOperation({ summary: 'Remove referred participant from ambassador' })
  @ApiParam({ name: 'id', description: 'Ambassador ID', example: '507f1f77bcf86cd799439011' })
  @ApiParam({ name: 'participantId', description: 'Referred Participant ID' })
  @ApiResponse({ status: 200, description: 'Referred participant removed successfully' })
  async removeReferredParticipant(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('participantId', ParseMongoIdPipe) participantId: string,
  ) {
    const participant = await this.participantsService.removeReferredParticipant(
      id,
      participantId,
    );
    return {
      status: 'success',
      message: 'Referred participant removed successfully',
      data: participant,
    };
  }

  @Post(':id/travel-grant/apply')
  @ApiOperation({ summary: 'Apply for travel grant' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Travel grant application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Not qualified for travel grant' })
  async applyForTravelGrant(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.applyForTravelGrant(id);
    return {
      status: 'success',
      message: 'Travel grant application submitted successfully',
      data: participant,
    };
  }

  @Patch(':id/travel-grant/decide')
  @ApiOperation({ summary: 'Approve or reject travel grant application' })
  @ApiParam({ name: 'id', description: 'Participant ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Travel grant decision recorded successfully' })
  @ApiResponse({ status: 400, description: 'No travel grant application found' })
  async decideTravelGrant(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: TravelGrantDecisionDto,
  ) {
    const participant = await this.participantsService.decideTravelGrant(id, dto.approved);
    return {
      status: 'success',
      message: `Travel grant ${dto.approved ? 'approved' : 'rejected'} successfully`,
      data: participant,
    };
  }
}
