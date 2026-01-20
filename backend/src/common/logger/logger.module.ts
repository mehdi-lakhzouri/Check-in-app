import { Global, Module } from '@nestjs/common';
import { PinoLoggerService } from './pino-logger.service';

/**
 * Token for injecting the logger
 */
export const PINO_LOGGER = 'PINO_LOGGER';

/**
 * Global Logger Module
 *
 * Provides PinoLoggerService application-wide.
 * Use `@Inject(PINO_LOGGER)` or inject `PinoLoggerService` directly.
 *
 * @example
 * ```typescript
 * import { PINO_LOGGER, PinoLoggerService } from './common/logger';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @Inject(PINO_LOGGER) private readonly logger: PinoLoggerService
 *   ) {
 *     this.logger.setContext(MyService.name);
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [
    PinoLoggerService,
    {
      provide: PINO_LOGGER,
      useClass: PinoLoggerService,
    },
  ],
  exports: [PinoLoggerService, PINO_LOGGER],
})
export class LoggerModule {}
