import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CheckIn,
  CheckInSchema,
  CheckInAttempt,
  CheckInAttemptSchema,
} from './schemas';
import { CheckInRepository, CheckInAttemptRepository } from './repositories';
import { CheckInsService } from './services';
import { CheckInsController } from './controllers';
import { ParticipantsModule } from '../participants';
import { SessionsModule } from '../sessions';
import { RegistrationsModule } from '../registrations';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckIn.name, schema: CheckInSchema },
      { name: CheckInAttempt.name, schema: CheckInAttemptSchema },
    ]),
    forwardRef(() => ParticipantsModule),
    forwardRef(() => SessionsModule),
    forwardRef(() => RegistrationsModule),
  ],
  controllers: [CheckInsController],
  providers: [CheckInsService, CheckInRepository, CheckInAttemptRepository],
  exports: [CheckInsService, CheckInRepository, CheckInAttemptRepository],
})
export class CheckInsModule {}
