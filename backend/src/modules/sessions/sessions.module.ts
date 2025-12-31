import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './schemas';
import { SessionRepository } from './repositories';
import { SessionsService } from './services';
import { SessionsController } from './controllers';
import { RegistrationsModule } from '../registrations/registrations.module';
import { CheckInsModule } from '../checkins/checkins.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    forwardRef(() => RegistrationsModule),
    forwardRef(() => CheckInsModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionRepository],
  exports: [SessionsService, SessionRepository],
})
export class SessionsModule {}
