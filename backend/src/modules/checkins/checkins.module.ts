import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckIn, CheckInSchema } from './schemas';
import { CheckInRepository } from './repositories';
import { CheckInsService } from './services';
import { CheckInsController } from './controllers';
import { ParticipantsModule } from '../participants';
import { SessionsModule } from '../sessions';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CheckIn.name, schema: CheckInSchema }]),
    forwardRef(() => ParticipantsModule),
    forwardRef(() => SessionsModule),
  ],
  controllers: [CheckInsController],
  providers: [CheckInsService, CheckInRepository],
  exports: [CheckInsService, CheckInRepository],
})
export class CheckInsModule {}
