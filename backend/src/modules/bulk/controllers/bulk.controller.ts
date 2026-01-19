import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { BulkService } from '../services';
import {
  BulkAssignParticipantsDto,
  BulkUploadResultDto,
  BulkAssignResultDto,
} from '../dto';
import { ParseMongoIdPipe } from '../../../common';

@ApiTags('Bulk Operations')
@Controller('bulk')
export class BulkController {
  constructor(private readonly bulkService: BulkService) {}

  @Get('template/participants')
  @ApiOperation({ summary: 'Download participants template' })
  async getParticipantsTemplate(@Res() res: Response): Promise<void> {
    const { buffer, filename } =
      this.bulkService.generateParticipantsTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Post('upload/participants')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk upload participants from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file with participants data',
        },
      },
    },
  })
  async uploadParticipants(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BulkUploadResultDto> {
    return this.bulkService.bulkUploadParticipants(file);
  }

  @Post('upload/sessions/:sessionId/participants')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Bulk upload participants and register them to a session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file with participants data',
        },
      },
    },
  })
  async uploadParticipantsToSession(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BulkUploadResultDto & { registered: number }> {
    return this.bulkService.bulkUploadToSession(sessionId, file);
  }

  @Post('sessions/:sessionId/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk assign participants to a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async assignParticipantsToSession(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Body() dto: BulkAssignParticipantsDto,
  ): Promise<BulkAssignResultDto> {
    return this.bulkService.assignParticipantsToSession(
      sessionId,
      dto.participantIds,
    );
  }

  @Get('sessions/:sessionId/export')
  @ApiOperation({
    summary: 'Export session data (registrations and check-ins) to Excel',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async exportSessionData(
    @Param('sessionId', ParseMongoIdPipe) sessionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } =
      await this.bulkService.exportSessionData(sessionId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
