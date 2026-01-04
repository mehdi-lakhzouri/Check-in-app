# Production Logging System

## Overview

This backend uses **Pino** for production-grade logging, providing:

- **Structured JSON logs** for machine parsing
- **Non-blocking async I/O** for high performance
- **Environment-aware log levels**
- **Request correlation IDs** for tracing
- **Sensitive data redaction**
- **5x faster** than Winston

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      HTTP Request                             │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              CorrelationIdMiddleware                          │
│         Assigns unique reqId to each request                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              RequestContextMiddleware                         │
│         Propagates context via AsyncLocalStorage              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              HttpLoggingMiddleware                            │
│         Logs request entry/exit with timing                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                   PinoLoggerService                           │
│         Structured JSON logging with Pino                     │
└──────────────────────────────────────────────────────────────┘
```

## Configuration

### Log Levels by Environment

| Environment | Minimum Level | Included Levels |
|-------------|---------------|-----------------|
| development | debug | debug, info, warn, error, fatal |
| test | warn | warn, error, fatal |
| staging | info | info, warn, error, fatal |
| production | warn | warn, error, fatal |

### Environment Variables

```bash
# Required
NODE_ENV=production|staging|development|test

# Optional
LOG_LEVEL=debug|info|warn|error|fatal  # Override default level
```

## Usage

### Basic Logging

```typescript
import { PinoLoggerService } from './common/logger';

@Injectable()
export class MyService {
  private readonly logger: PinoLoggerService;

  constructor() {
    this.logger = new PinoLoggerService();
    this.logger.setContext(MyService.name);
  }

  async myMethod() {
    // Basic logging
    this.logger.log('Operation started');
    
    // With context
    this.logger.log('User created', { userId: '123', email: 'user@example.com' });
    
    // Error with stack trace
    try {
      // ...
    } catch (error) {
      this.logger.error('Operation failed', error.stack, { userId: '123' });
    }
    
    // Debug (filtered in production)
    this.logger.debug('Cache lookup', { key: 'user:123', hit: true });
    
    // Warning
    this.logger.warn('Rate limit approaching', { current: 95, max: 100 });
  }
}
```

### Specialized Logging Methods

```typescript
// HTTP Request/Response
this.logger.logRequest({
  method: 'POST',
  url: '/api/v1/checkin/qr',
  reqId: 'abc-123',
  ip: '192.168.1.1',
});

this.logger.logResponse({
  method: 'POST',
  url: '/api/v1/checkin/qr',
  reqId: 'abc-123',
  statusCode: 201,
  duration: 45,
});

// Database Operations
this.logger.logDbOperation({
  type: 'query',
  collection: 'participants',
  duration: 12,
  success: true,
});

// Redis Operations
this.logger.logRedisOperation({
  command: 'GET',
  key: 'session:123',
  duration: 1,
  hit: true,
});

// Bull Jobs
this.logger.logJob({
  event: 'completed',
  queue: 'session-scheduler',
  jobId: 123,
  jobType: 'auto-open',
  duration: 50,
});

// WebSocket Events
this.logger.logWebSocket({
  type: 'connect',
  clientId: 'socket-id-123',
});

// Security Events
this.logger.logSecurity({
  type: 'rate_limit',
  ip: '192.168.1.1',
  reason: 'Too many requests',
});

// Business Metrics
this.logger.logMetric({
  name: 'checkin_count',
  value: 150,
  unit: 'count',
  tags: { sessionId: '123' },
});
```

### Accessing Request Context

```typescript
import { getCurrentRequestId, getCurrentRequestContext } from './common/logger';

// In any function (thanks to AsyncLocalStorage)
function someHelper() {
  const reqId = getCurrentRequestId();
  const ctx = getCurrentRequestContext();
  
  console.log(reqId); // 'abc-123-xyz'
  console.log(ctx); // { reqId: 'abc-123-xyz', startTime: 1704326400000 }
}
```

## Log Output Formats

### Development (Pretty)

```
[12:04:19.554] INFO: Application started
    service: "checkin-api"
    version: "0.0.1"
    env: "development"
    port: 3000
```

### Production (JSON)

```json
{
  "level": "info",
  "time": 1704326659554,
  "pid": 14876,
  "hostname": "server-01",
  "service": "checkin-api",
  "version": "0.0.1",
  "env": "production",
  "context": "Bootstrap",
  "msg": "Application started",
  "port": 3000
}
```

## Integration Points

### 1. NestJS Application Logger

The app uses Pino as the NestJS application logger in production:

```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'production' 
    ? new PinoLoggerService() 
    : ['error', 'warn', 'log', 'debug', 'verbose'],
});
```

### 2. HTTP Middleware Stack

Applied to all routes in `app.module.ts`:

```typescript
consumer
  .apply(
    CorrelationIdMiddleware,  // 1. Assign/extract reqId
    RequestContextMiddleware, // 2. Propagate via AsyncLocalStorage
    HttpLoggingMiddleware,    // 3. Log request/response
  )
  .forRoutes('*');
```

### 3. Exception Filter

All exceptions are logged with full context:

```typescript
// Automatic structured logging for all errors
{
  "level": "error",
  "reqId": "abc-123",
  "method": "POST",
  "url": "/api/v1/checkin/qr",
  "statusCode": 404,
  "message": "Participant not found",
  "stack": "Error: Participant not found\n    at ..."
}
```

## Correlation ID Tracing

Every request gets a unique ID that flows through the entire system:

1. **Incoming request**: ID is extracted from `x-request-id` header or generated
2. **Throughout processing**: ID is available via `getCurrentRequestId()`
3. **Response**: ID is returned in `x-request-id` header
4. **All logs**: Include `reqId` field for tracing

Example trace:
```json
{"reqId":"abc-123","msg":"→ POST /api/v1/checkin/qr"}
{"reqId":"abc-123","msg":"Finding participant by QR code","qrCode":"QR-ABC123"}
{"reqId":"abc-123","msg":"Cache MISS for participant"}
{"reqId":"abc-123","msg":"DB query on participants","duration":12}
{"reqId":"abc-123","msg":"Check-in created","participantId":"p-123"}
{"reqId":"abc-123","msg":"← POST /api/v1/checkin/qr 201 45ms"}
```

## Performance

Pino is designed for high-throughput scenarios:

- **Non-blocking I/O**: Uses libuv thread pool
- **Efficient serialization**: ~5x faster than Winston
- **Log level filtering**: Compile-time optimization
- **Minimal allocations**: Object reuse patterns

Benchmark (per 10,000 logs):
- Pino: ~200ms
- Winston: ~1000ms
- Bunyan: ~600ms

## Log Aggregation

For production, pipe logs to your aggregator:

```bash
# Elasticsearch
node dist/main.js | pino-elasticsearch

# Datadog
node dist/main.js | pino-datadog

# CloudWatch
node dist/main.js | pino-cloudwatch

# File rotation
node dist/main.js | pino-tee log.json
```

## Sensitive Data Handling

Automatic redaction of sensitive fields:

```typescript
// These paths are automatically redacted
const redactedPaths = [
  'password',
  'token',
  'secret',
  'authorization',
  'req.headers.authorization',
  'req.headers.cookie',
  'body.password',
  'body.token',
];

// Example log output
{
  "password": "[REDACTED]",
  "email": "user@example.com"
}
```

## Migration Guide

### From NestJS Logger

```typescript
// Before
import { Logger } from '@nestjs/common';
private readonly logger = new Logger(MyService.name);
this.logger.log(`User created: ${userId}`);

// After
import { PinoLoggerService } from './common/logger';
private readonly logger: PinoLoggerService;
constructor() {
  this.logger = new PinoLoggerService();
  this.logger.setContext(MyService.name);
}
this.logger.log('User created', { userId });
```

### From console.log

```typescript
// Before
console.log(`Server started on port ${port}`);
console.error(`Error: ${error.message}`);

// After
this.logger.log('Server started', { port });
this.logger.error('Error occurred', error.stack, { context: 'Bootstrap' });
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/common/logger/pino-logger.service.ts` | Core Pino logger implementation |
| `src/common/logger/logger.module.ts` | NestJS module for DI |
| `src/common/logger/request-logging.middleware.ts` | HTTP request/response logging |
| `src/common/logger/index.ts` | Public exports |
