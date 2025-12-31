import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Config
import { appConfig, databaseConfig, throttleConfig, uploadConfig } from './config';

// Database
import { DatabaseModule } from './database';

// Common
import {
  AllExceptionsFilter,
  MongoExceptionFilter,
  TransformInterceptor,
  LoggingInterceptor,
  TimeoutInterceptor,
} from './common';

// Feature Modules
import { SessionsModule } from './modules/sessions';
import { ParticipantsModule } from './modules/participants';
import { RegistrationsModule } from './modules/registrations';
import { CheckInsModule } from './modules/checkins';
import { ReportsModule } from './modules/reports';
import { BulkModule } from './modules/bulk';
import { HealthModule } from './modules/health';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, throttleConfig, uploadConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') ?? 60000,
            limit: config.get<number>('throttle.limit') ?? 100,
          },
        ],
      }),
    }),

    // Database
    DatabaseModule,

    // Feature Modules
    SessionsModule,
    ParticipantsModule,
    RegistrationsModule,
    CheckInsModule,
    ReportsModule,
    BulkModule,
    HealthModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: MongoExceptionFilter,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}
