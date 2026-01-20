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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RegistrationsService } from '../services';
import {
  CreateRegistrationDto,
  UpdateRegistrationDto,
  RegistrationFilterDto,
} from '../dto';
import { Registration } from '../schemas';
import { ParseMongoIdPipe } from '../../../common/pipes';
import {
  ApiPaginatedResponse,
  ApiStandardResponse,
} from '../../../common/decorators';

@ApiTags('registrations')
@Controller('registrations')
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new registration' })
  @ApiStandardResponse(Registration, 'Registration created successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Registration already exists' })
  async create(@Body() createRegistrationDto: CreateRegistrationDto) {
    const registration = await this.registrationsService.create(
      createRegistrationDto,
    );
    return {
      status: 'success',
      message: 'Registration created successfully',
      data: registration,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all registrations with pagination and filtering',
  })
  @ApiPaginatedResponse(Registration, 'Registrations retrieved successfully')
  async findAll(@Query() filterDto: RegistrationFilterDto) {
    const result = await this.registrationsService.findAll(filterDto);
    return {
      status: 'success',
      message: 'Registrations retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a registration by ID' })
  @ApiParam({
    name: 'id',
    description: 'Registration ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Registration, 'Registration retrieved successfully')
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async findOne(@Param('id', ParseMongoIdPipe) id: string) {
    const registration = await this.registrationsService.findOne(id);
    return {
      status: 'success',
      message: 'Registration retrieved successfully',
      data: registration,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a registration' })
  @ApiParam({
    name: 'id',
    description: 'Registration ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Registration, 'Registration updated successfully')
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateRegistrationDto: UpdateRegistrationDto,
  ) {
    const registration = await this.registrationsService.update(
      id,
      updateRegistrationDto,
    );
    return {
      status: 'success',
      message: 'Registration updated successfully',
      data: registration,
    };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get registration statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            confirmed: { type: 'number' },
            pending: { type: 'number' },
            cancelled: { type: 'number' },
            todayRegistrations: { type: 'number' },
          },
        },
      },
    },
  })
  async getStats() {
    const stats = await this.registrationsService.getStats();
    return {
      status: 'success',
      message: 'Registration statistics retrieved successfully',
      data: stats,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a registration' })
  @ApiParam({
    name: 'id',
    description: 'Registration ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiStandardResponse(Registration, 'Registration deleted successfully')
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async remove(@Param('id', ParseMongoIdPipe) id: string) {
    const registration = await this.registrationsService.remove(id);
    return {
      status: 'success',
      message: 'Registration deleted successfully',
      data: registration,
    };
  }
}
