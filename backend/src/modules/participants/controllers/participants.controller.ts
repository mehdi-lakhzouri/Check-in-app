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
import {
  ApiPaginatedResponse,
  ApiStandardResponse,
} from '../../../common/decorators';

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
    const participant =
      await this.participantsService.create(createParticipantDto);
    return {
      status: 'success',
      message: 'Participant created successfully',
      data: participant,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all participants with pagination and filtering',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
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
  @ApiParam({
    name: 'qrCode',
    description: 'QR code string',
    example: 'QR-ABC123XYZ',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
  })
  async getAmbassadorLeaderboard(@Query('limit') limit?: number) {
    const ambassadors =
      await this.participantsService.getAmbassadorLeaderboard(limit);
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
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully',
  })
  async getTravelGrantApplications(
    @Query('status') status?: boolean,
    @Query('organization') organization?: string,
  ) {
    const applications =
      await this.participantsService.getTravelGrantApplications(
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
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getTravelGrantStats() {
    const stats = await this.participantsService.getTravelGrantStats();
    return {
      status: 'success',
      message: 'Travel grant statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('travel-grants')
  @ApiOperation({ summary: 'Get all travel grant applicants' })
  @ApiResponse({
    status: 200,
    description: 'Travel grant applicants retrieved successfully',
  })
  async getAllTravelGrants() {
    const applicants = await this.participantsService.getAllTravelGrants();
    return {
      status: 'success',
      message: 'Travel grant applicants retrieved successfully',
      data: applicants,
    };
  }

  @Get('ambassadors')
  @ApiOperation({ summary: 'Get all ambassadors' })
  @ApiResponse({
    status: 200,
    description: 'Ambassadors retrieved successfully',
  })
  async getAllAmbassadors() {
    const ambassadors = await this.participantsService.getAllAmbassadors();
    return {
      status: 'success',
      message: 'Ambassadors retrieved successfully',
      data: ambassadors,
    };
  }

  @Get('ambassadors/search')
  @ApiOperation({ summary: 'Search ambassadors with pagination and sorting' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'ambassadorPoints',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Ambassadors retrieved successfully',
  })
  async searchAmbassadors(
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'ambassadorPoints',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.participantsService.searchAmbassadors(
      search,
      sortBy,
      sortOrder,
      Number(page),
      Number(limit),
    );
    return {
      status: 'success',
      message: 'Ambassadors retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('travel-grants/search')
  @ApiOperation({ summary: 'Search travel grant applicants with pagination' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'travelGrantAppliedAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Travel grant applicants retrieved successfully',
  })
  async searchTravelGrants(
    @Query('search') search?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
    @Query('sortBy') sortBy: string = 'travelGrantAppliedAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.participantsService.searchTravelGrants(
      search,
      status,
      sortBy,
      sortOrder,
      Number(page),
      Number(limit),
    );
    return {
      status: 'success',
      message: 'Travel grant applicants retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a participant by ID' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
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
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Participant details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async getDetails(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.findOne(id);
    const qrDataUrl = await this.participantsService.getQrCodeDataUrl(
      participant.qrCode,
    );
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
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Ambassador activity retrieved successfully',
  })
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
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Qualification status retrieved successfully',
  })
  async checkTravelGrantQualification(
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    const qualification =
      await this.participantsService.checkTravelGrantQualification(id);
    return {
      status: 'success',
      message: 'Travel grant qualification status retrieved successfully',
      data: qualification,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a participant' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Participant, 'Participant updated successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ) {
    const participant = await this.participantsService.update(
      id,
      updateParticipantDto,
    );
    return {
      status: 'success',
      message: 'Participant updated successfully',
      data: participant,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a participant' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
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
    const result = await this.participantsService.bulkCreate(
      bulkCreateDto.participants,
    );
    return {
      status: 'success',
      message: `Created ${result.created} participants, ${result.failed} failed`,
      data: result,
    };
  }

  @Post(':id/ambassador/calculate-points')
  @ApiOperation({ summary: 'Calculate ambassador points' })
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Points calculated successfully' })
  async calculateAmbassadorPoints(@Param('id', ParseMongoIdPipe) id: string) {
    const participant =
      await this.participantsService.calculateAmbassadorPoints(id);
    return {
      status: 'success',
      message: 'Ambassador points calculated successfully',
      data: participant,
    };
  }

  @Post(':id/ambassador/add-referred')
  @ApiOperation({ summary: 'Add referred participant to ambassador' })
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Referred participant added successfully',
  })
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
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({ name: 'participantId', description: 'Referred Participant ID' })
  @ApiResponse({
    status: 200,
    description: 'Referred participant removed successfully',
  })
  async removeReferredParticipant(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('participantId', ParseMongoIdPipe) participantId: string,
  ) {
    const participant =
      await this.participantsService.removeReferredParticipant(
        id,
        participantId,
      );
    return {
      status: 'success',
      message: 'Referred participant removed successfully',
      data: participant,
    };
  }

  @Post(':id/ambassador/sync-referrals')
  @ApiOperation({ summary: 'Sync ambassador referrals based on organization' })
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Referrals synced successfully' })
  @ApiResponse({
    status: 400,
    description: 'Participant is not an ambassador or has no organization',
  })
  async syncAmbassadorReferrals(@Param('id', ParseMongoIdPipe) id: string) {
    const result = await this.participantsService.syncOrganizationReferrals(id);
    return {
      status: 'success',
      message: `Synced referrals: added ${result.addedCount} new, total ${result.totalReferrals}`,
      data: result,
    };
  }

  @Post('ambassadors/sync-all-referrals')
  @ApiOperation({
    summary: 'Sync referrals for all ambassadors based on their organizations',
  })
  @ApiResponse({
    status: 200,
    description: 'All ambassador referrals synced successfully',
  })
  async syncAllAmbassadorReferrals() {
    const result = await this.participantsService.syncAllAmbassadorReferrals();
    return {
      status: 'success',
      message: `Processed ${result.processed} ambassadors, added ${result.totalAdded} total referrals`,
      data: result,
    };
  }

  @Post(':id/travel-grant/apply')
  @ApiOperation({ summary: 'Apply for travel grant' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Travel grant application submitted successfully',
  })
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
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Travel grant decision recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No travel grant application found',
  })
  async decideTravelGrant(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: TravelGrantDecisionDto,
  ) {
    const participant = await this.participantsService.decideTravelGrant(
      id,
      dto.approved,
    );
    return {
      status: 'success',
      message: `Travel grant ${dto.approved ? 'approved' : 'rejected'} successfully`,
      data: participant,
    };
  }

  @Post(':id/travel-grant/approve')
  @ApiOperation({ summary: 'Approve travel grant application' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Travel grant approved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No travel grant application found',
  })
  async approveTravelGrant(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.decideTravelGrant(
      id,
      true,
    );
    return {
      status: 'success',
      message: 'Travel grant approved successfully',
      data: participant,
    };
  }

  @Post(':id/travel-grant/reject')
  @ApiOperation({ summary: 'Reject travel grant application' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Travel grant rejected successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No travel grant application found',
  })
  async rejectTravelGrant(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.decideTravelGrant(
      id,
      false,
    );
    return {
      status: 'success',
      message: 'Travel grant rejected successfully',
      data: participant,
    };
  }

  @Post(':id/ambassador/promote')
  @ApiOperation({ summary: 'Promote participant to ambassador' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Participant promoted to ambassador successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Participant is already an ambassador',
  })
  async promoteToAmbassador(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.promoteToAmbassador(id);
    return {
      status: 'success',
      message: 'Participant promoted to ambassador successfully',
      data: participant,
    };
  }

  @Post(':id/ambassador/demote')
  @ApiOperation({ summary: 'Demote ambassador to regular participant' })
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Ambassador demoted successfully' })
  @ApiResponse({ status: 400, description: 'Participant is not an ambassador' })
  async demoteFromAmbassador(@Param('id', ParseMongoIdPipe) id: string) {
    const participant = await this.participantsService.demoteFromAmbassador(id);
    return {
      status: 'success',
      message: 'Ambassador demoted to regular participant successfully',
      data: participant,
    };
  }

  @Get(':id/ambassador/details')
  @ApiOperation({
    summary: 'Get detailed ambassador information with referrals',
  })
  @ApiParam({
    name: 'id',
    description: 'Ambassador ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Ambassador details retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Participant is not an ambassador' })
  async getAmbassadorDetails(@Param('id', ParseMongoIdPipe) id: string) {
    const details = await this.participantsService.getAmbassadorDetails(id);
    return {
      status: 'success',
      message: 'Ambassador details retrieved successfully',
      data: details,
    };
  }

  @Get(':id/travel-grant/details')
  @ApiOperation({ summary: 'Get detailed travel grant applicant information' })
  @ApiParam({
    name: 'id',
    description: 'Participant ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Travel grant details retrieved successfully',
  })
  async getTravelGrantDetails(@Param('id', ParseMongoIdPipe) id: string) {
    const details = await this.participantsService.getTravelGrantDetails(id);
    return {
      status: 'success',
      message: 'Travel grant details retrieved successfully',
      data: details,
    };
  }
}
