import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Participant, ParticipantSchema } from './schemas';
import { ParticipantRepository } from './repositories';
import { ParticipantsService } from './services';
import { ParticipantsController } from './controllers';
import { CheckInsModule } from '../checkins';
import { RegistrationsModule } from '../registrations';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
    ]),
    forwardRef(() => CheckInsModule),
    forwardRef(() => RegistrationsModule),
    RedisModule, // Required for RedisSingleflightService
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantRepository],
  exports: [ParticipantsService, ParticipantRepository],
})
export class ParticipantsModule {}
