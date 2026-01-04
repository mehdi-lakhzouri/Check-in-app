import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { Session, SessionSchema } from './schemas';
import { SessionRepository } from './repositories';
import { SessionsService, SessionSchedulerService } from './services';
import { SessionsController } from './controllers';
import { RegistrationsModule } from '../registrations/registrations.module';
import { CheckInsModule } from '../checkins/checkins.module';
import sessionSchedulerConfig from '../../config/session-scheduler.config';
import { SESSION_SCHEDULER_QUEUE, SessionSchedulerProcessor } from './processors';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    ConfigModule.forFeature(sessionSchedulerConfig),
    BullModule.registerQueueAsync({
      name: SESSION_SCHEDULER_QUEUE,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const password = configService.get<string>('REDIS_PASSWORD');
        return {
          redis: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            ...(password ? { password } : {}),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        };
      },
      inject: [ConfigService],
    }),
    forwardRef(() => RegistrationsModule),
    forwardRef(() => CheckInsModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionRepository, SessionSchedulerService, SessionSchedulerProcessor],
  exports: [SessionsService, SessionRepository, SessionSchedulerService, SessionSchedulerProcessor],
})
export class SessionsModule {}
