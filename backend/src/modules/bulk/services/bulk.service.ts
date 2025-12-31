import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParticipantsService } from '../../participants/services';
import { RegistrationsService } from '../../registrations/services';
import { SessionsService } from '../../sessions/services';
import { CheckInsService } from '../../checkins/services';
import { BulkUploadResultDto, BulkAssignResultDto } from '../dto';
import { RegistrationStatus } from '../../registrations/schemas';

interface ParticipantRow {
  name: string;
  email: string;
  organization?: string;
  phone?: string;
}

@Injectable()
export class BulkService {
  private readonly logger = new Logger(BulkService.name);

  constructor(
    private readonly participantsService: ParticipantsService,
    private readonly registrationsService: RegistrationsService,
    private readonly sessionsService: SessionsService,
    private readonly checkInsService: CheckInsService,
  ) {}

  generateParticipantsTemplate(): { buffer: Buffer; filename: string } {
    const templateData = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        organization: 'ACME Corp',
        phone: '+1234567890',
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        organization: 'Tech Inc',
        phone: '+0987654321',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      filename: 'participants-template.xlsx',
    };
  }

  async bulkUploadParticipants(file: Express.Multer.File): Promise<BulkUploadResultDto> {
    this.logger.log(`Processing bulk upload: ${file.originalname}`);

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ParticipantRow[] = XLSX.utils.sheet_to_json(worksheet);

    let created = 0;
    const errors: Array<{ row: number; email: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Account for header row

      try {
        if (!row.name || !row.email) {
          throw new Error('Name and email are required');
        }

        await this.participantsService.create({
          name: row.name.trim(),
          email: row.email.trim(),
          organization: row.organization?.trim(),
          phone: row.phone?.trim(),
        });

        created++;
      } catch (error) {
        errors.push({
          row: rowNumber,
          email: row.email || 'unknown',
          error: error.message,
        });
      }
    }

    this.logger.log(`Bulk upload completed: ${created} created, ${errors.length} failed`);

    return {
      created,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async bulkUploadToSession(
    sessionId: string,
    file: Express.Multer.File,
  ): Promise<BulkUploadResultDto & { registered: number }> {
    this.logger.log(`Processing bulk upload for session: ${sessionId}`);

    // Verify session exists
    await this.sessionsService.findOne(sessionId);

    // First, upload participants
    const uploadResult = await this.bulkUploadParticipants(file);

    // Then, get all participants by email and register them
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ParticipantRow[] = XLSX.utils.sheet_to_json(worksheet);

    let registered = 0;

    for (const row of rows) {
      try {
        const participant = await this.participantsService.findByEmail(row.email?.trim());
        if (participant) {
          await this.registrationsService.create({
            participantId: participant._id.toString(),
            sessionId,
            status: RegistrationStatus.CONFIRMED,
          });
          registered++;
        }
      } catch (error) {
        // Registration might already exist, continue
        this.logger.debug(`Registration skipped for ${row.email}: ${error.message}`);
      }
    }

    return {
      ...uploadResult,
      registered,
    };
  }

  async assignParticipantsToSession(
    sessionId: string,
    participantIds: string[],
  ): Promise<BulkAssignResultDto> {
    this.logger.log(`Assigning ${participantIds.length} participants to session: ${sessionId}`);

    // Verify session exists
    await this.sessionsService.findOne(sessionId);

    let assigned = 0;
    let skipped = 0;
    const errors: Array<{ participantId: string; error: string }> = [];

    for (const participantId of participantIds) {
      try {
        // Verify participant exists
        await this.participantsService.findOne(participantId);

        await this.registrationsService.create({
          participantId,
          sessionId,
          status: RegistrationStatus.CONFIRMED,
        });

        assigned++;
      } catch (error) {
        if (error.message?.includes('already exists')) {
          skipped++;
        } else {
          errors.push({
            participantId,
            error: error.message,
          });
        }
      }
    }

    this.logger.log(
      `Assignment completed: ${assigned} assigned, ${skipped} skipped, ${errors.length} failed`,
    );

    return {
      assigned,
      skipped,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async exportSessionData(sessionId: string): Promise<{ buffer: Buffer; filename: string }> {
    this.logger.log(`Exporting session data: ${sessionId}`);

    const session = await this.sessionsService.findOne(sessionId);
    const checkIns = await this.checkInsService.findBySession(sessionId);
    const registrations = await this.registrationsService.findBySession(sessionId);

    // Create registrations sheet
    const registrationsData = registrations.map((reg) => ({
      participantName: (reg.participantId as any)?.name || 'Unknown',
      participantEmail: (reg.participantId as any)?.email || 'Unknown',
      organization: (reg.participantId as any)?.organization || 'N/A',
      status: reg.status,
      registrationDate: reg.registrationDate,
    }));

    // Create check-ins sheet
    const checkInsData = checkIns.map((checkIn) => ({
      participantName: (checkIn.participantId as any)?.name || 'Unknown',
      participantEmail: (checkIn.participantId as any)?.email || 'Unknown',
      organization: (checkIn.participantId as any)?.organization || 'N/A',
      checkInTime: checkIn.checkInTime,
      method: checkIn.method,
    }));

    const workbook = XLSX.utils.book_new();

    // Add summary sheet
    const summaryData = [
      { field: 'Session Name', value: session.name },
      { field: 'Start Time', value: session.startTime.toISOString() },
      { field: 'End Time', value: session.endTime.toISOString() },
      { field: 'Location', value: session.location || 'N/A' },
      { field: 'Total Registrations', value: registrations.length },
      { field: 'Total Check-ins', value: checkIns.length },
      { field: 'Attendance Rate', value: registrations.length > 0 
          ? ((checkIns.length / registrations.length) * 100).toFixed(2) + '%'
          : '0%' },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add registrations sheet
    const registrationsSheet = XLSX.utils.json_to_sheet(registrationsData);
    XLSX.utils.book_append_sheet(workbook, registrationsSheet, 'Registrations');

    // Add check-ins sheet
    const checkInsSheet = XLSX.utils.json_to_sheet(checkInsData);
    XLSX.utils.book_append_sheet(workbook, checkInsSheet, 'Check-ins');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeName = session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    return {
      buffer,
      filename: `session-${safeName}-export-${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  }
}
