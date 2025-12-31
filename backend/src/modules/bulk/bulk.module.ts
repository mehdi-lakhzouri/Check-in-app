import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BulkController } from './controllers';
import { BulkService } from './services';
import { ParticipantsModule } from '../participants';
import { RegistrationsModule } from '../registrations';
import { SessionsModule } from '../sessions';
import { CheckInsModule } from '../checkins';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type. Only Excel and CSV files are allowed.'), false);
        }
      },
    }),
    ParticipantsModule,
    RegistrationsModule,
    SessionsModule,
    CheckInsModule,
  ],
  controllers: [BulkController],
  providers: [BulkService],
  exports: [BulkService],
})
export class BulkModule {}
