import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './services';
import { ReportsController } from './controllers';
import { SessionsModule } from '../sessions';
import { ParticipantsModule } from '../participants';
import { CheckInsModule } from '../checkins';
import { RegistrationsModule } from '../registrations';

@Module({
  imports: [
    forwardRef(() => SessionsModule),
    forwardRef(() => ParticipantsModule),
    forwardRef(() => CheckInsModule),
    forwardRef(() => RegistrationsModule),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
