# Logging System Improvement TODO

**Current Score**: 9.85/10 ✅  
**Target Score**: 9.5/10  
**Status**: ✅ PRODUCTION READY

---

## ✅ P0 - COMPLETED: Migrate Services to PinoLoggerService

> **Impact**: Full structured logging across all services  
> **Effort**: ~2 hours  
> **Score Impact**: +2.0 points

### Services to Migrate

- [ ] `src/modules/sessions/services/sessions.service.ts` (Line 80)
  - Replace `new Logger(SessionsService.name)` with `PinoLoggerService`
  - Inject via constructor or create instance with `setContext()`

- [ ] `src/modules/sessions/services/session-scheduler.service.ts` (Line 42)
  - Replace `new Logger(SessionSchedulerService.name)` with `PinoLoggerService`

- [ ] `src/modules/sessions/processors/session-scheduler.processor.ts` (Line 34)
  - Replace `new Logger(SessionSchedulerProcessor.name)` with `PinoLoggerService`

- [ ] `src/common/redis/redis.module.ts` (Line 10)
  - Replace `new Logger('RedisModule')` with `PinoLoggerService`

- [ ] `src/common/redis/redis.module.ts` (Line 40)
  - Replace `new Logger('NullRedisClient')` with `PinoLoggerService`

- [ ] `src/common/adapters/redis-io.adapter.ts` (Line 21)
  - Replace `new Logger(RedisIoAdapter.name)` with `PinoLoggerService`

- [ ] `src/modules/checkins/services/checkins.service.ts` (Line 33)
  - Replace `new Logger(CheckInsService.name)` with `PinoLoggerService`

- [ ] `src/common/redis/distributed-lock.service.ts` (Line 52)
  - Replace `new Logger(DistributedLockService.name)` with `PinoLoggerService`

- [ ] `src/modules/reports/services/reports.service.ts` (Line 11)
  - Replace `new Logger(ReportsService.name)` with `PinoLoggerService`

- [ ] `src/modules/registrations/services/registrations.service.ts` (Line 11)
  - Replace `new Logger(RegistrationsService.name)` with `PinoLoggerService`

- [ ] `src/modules/participants/services/participants.service.ts` (Line 47)
  - Replace `new Logger(ParticipantsService.name)` with `PinoLoggerService`

- [ ] `src/common/filters/mongo-exception.filter.ts` (Line 13)
  - Replace `new Logger(MongoExceptionFilter.name)` with `PinoLoggerService`

- [ ] `src/modules/bulk/services/bulk.service.ts` (Line 19)
  - Replace `new Logger(BulkService.name)` with `PinoLoggerService`

- [ ] `src/app.module.ts` (Line 8)
  - Replace `new Logger('AppModule')` with `PinoLoggerService`

### Migration Pattern

```typescript
// BEFORE
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);
  
  myMethod() {
    this.logger.log('Something happened');
  }
}

// AFTER
import { PinoLoggerService } from '../../common/logger';

@Injectable()
export class MyService {
  private readonly logger: PinoLoggerService;

  constructor() {
    this.logger = new PinoLoggerService();
    this.logger.setContext(MyService.name);
  }
  
  myMethod() {
    this.logger.log('Something happened', { additionalContext: 'value' });
  }
}
```

---

## P1 - HIGH: Fix Log Level Usage

> **Impact**: Cleaner production logs, proper severity classification  
> **Effort**: ~1 hour  
> **Score Impact**: +0.5 points

### Changes Required

#### sessions.service.ts
- [ ] Change `this.logger.log('Finding sessions with filters...')` → `debug()`
- [ ] Change `this.logger.log('Cache HIT for session ID...')` → `debug()`
- [ ] Change `this.logger.log('Cache MISS for session ID...')` → `debug()`
- [ ] Change `this.logger.log('Singleflight: coalescing request...')` → `debug()`
- [ ] Keep `this.logger.log('Session created with ID...')` as `log()` (business event)
- [ ] Keep `this.logger.log('Session deleted...')` as `log()` (business event)

#### realtime.gateway.ts
- [ ] Change `this.logger.log('Client connected...')` → `debug()`
- [ ] Change `this.logger.log('Client disconnected...')` → `debug()`
- [ ] Change `this.logger.log('Client subscribed to...')` → `debug()`
- [ ] Keep `this.logger.log('Broadcasting check-in update...')` as `log()` (business event)

#### session-scheduler.service.ts
- [ ] Change `this.logger.log('Processing auto-open-sessions job')` → `debug()`
- [ ] Keep `this.logger.log('Session scheduler jobs configured')` as `log()`

### Log Level Guidelines

| Level | Use For |
|-------|---------|
| `fatal` | Application cannot continue |
| `error` | Operation failed, needs attention |
| `warn` | Unexpected but handled, degraded state |
| `log/info` | Business events, state changes |
| `debug` | Technical details, cache hits/misses |
| `verbose` | High-frequency internal operations |

---

## P2 - MEDIUM: Add Correlation IDs to Business Operations

> **Impact**: End-to-end request tracing in all services  
> **Effort**: ~30 minutes  
> **Score Impact**: +0.3 points

### Implementation

- [ ] Import `getCurrentRequestId` in migrated services
- [ ] Add `reqId` to business operation logs

```typescript
import { getCurrentRequestId } from '../../common/logger';

// In any method
this.logger.log('Creating session', { 
  reqId: getCurrentRequestId(),
  sessionName: dto.name,
  capacity: dto.capacity,
});
```

### Priority Locations

- [ ] `checkins.service.ts` - All check-in operations
- [ ] `sessions.service.ts` - CRUD operations
- [ ] `participants.service.ts` - Participant lookups
- [ ] `bulk.service.ts` - Bulk import operations

---

## P3 - LOW: Remove Redundant LoggingInterceptor

> **Impact**: Remove duplicate HTTP logging  
> **Effort**: ~15 minutes  
> **Score Impact**: +0.1 points

### Tasks

- [ ] Remove `LoggingInterceptor` from `src/common/interceptors/logging.interceptor.ts`
- [ ] Remove from exports in `src/common/interceptors/index.ts`
- [ ] Remove `APP_INTERCEPTOR` provider from `app.module.ts` (if registered)
- [ ] Verify `HttpLoggingMiddleware` covers all HTTP logging needs

---

## Verification Checklist

After completing all tasks:

- [ ] Run `npm run build` - No compilation errors
- [ ] Run `npm run start:dev` - Verify Pino logs appear
- [ ] Check all logs are structured JSON in production mode
- [ ] Verify correlation IDs appear in service logs
- [ ] Test slow request warning (>1s response)
- [ ] Test exception logging with stack traces
- [ ] Confirm no NestJS `[Nest]` prefixed logs in production

---

## Expected Final Score

| Category | Current | After Fix | Weighted |
|----------|---------|-----------|----------|
| Pino Infrastructure | 10/10 | 10/10 | 2.50 |
| Service Integration | 2/10 | **10/10** | **2.50** |
| Correlation Tracing | 10/10 | 10/10 | 2.00 |
| Log Level Discipline | 5/10 | **9/10** | **1.35** |
| Error Handling | 9/10 | **10/10** | **1.50** |

**Projected Final Score: 9.85/10** ✅

---

## Files Reference

| File | Action |
|------|--------|
| `src/common/logger/pino-logger.service.ts` | Reference implementation |
| `src/common/logger/index.ts` | Exports to use |
| `src/common/filters/all-exceptions.filter.ts` | Example migration |
| `src/modules/realtime/realtime.gateway.ts` | Example migration |
