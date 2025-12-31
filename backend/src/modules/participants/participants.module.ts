import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Participant, ParticipantSchema } from './schemas';
import { ParticipantRepository } from './repositories';
import { ParticipantsService } from './services';
import { ParticipantsController } from './controllers';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Participant.name, schema: ParticipantSchema }]),
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantRepository],
  exports: [ParticipantsService, ParticipantRepository],
})
export class ParticipantsModule {}
