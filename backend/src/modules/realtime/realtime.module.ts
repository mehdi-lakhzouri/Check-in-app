import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { ParticipantsModule } from '../participants/participants.module';
import { CheckInsModule } from '../checkins/checkins.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [ParticipantsModule, CheckInsModule, SessionsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
