import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PinoLoggerService } from './pino-logger.service';

/**
 * Extended Express Request with correlation ID
 */
export interface RequestWithId extends Request {
  id: string;
  startTime: number;
}

/**
 * Header name for correlation ID
 * Can be set by upstream services (e.g., API gateway, load balancer)
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Request Correlation ID Middleware
 *
 * Assigns a unique correlation ID to each request for tracing.
 * If the `x-request-id` header is present, it uses that value.
 * Otherwise, generates a new UUID v4.
 *
 * The ID is:
 * - Attached to `req.id`
 * - Set as `x-request-id` response header
 * - Available for all downstream logging
 *
 * @example
 * ```typescript
 * // In logs:
 * {"level":"info","reqId":"abc-123","msg":"Processing request"}
 *
 * // In response headers:
 * x-request-id: abc-123
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    // Get or generate correlation ID
    const existingId = req.headers[REQUEST_ID_HEADER] as string;
    const requestId = existingId || randomUUID();

    // Attach to request
    req.id = requestId;
    req.startTime = Date.now();

    // Set response header
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}

/**
 * Production-grade HTTP Logging Middleware
 *
 * Features:
 * - Correlation ID tracking
 * - Request/response timing
 * - Status code aware log levels
 * - Structured JSON output
 * - Sensitive header redaction
 *
 * Log format:
 * ```json
 * {
 *   "level": "info",
 *   "reqId": "abc-123",
 *   "method": "POST",
 *   "url": "/api/v1/checkin/qr",
 *   "statusCode": 201,
 *   "duration": 45,
 *   "contentLength": 234
 * }
 * ```
 */
@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger: PinoLoggerService;

  constructor() {
    this.logger = new PinoLoggerService();
    this.logger.setContext('HTTP');
  }

  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const reqId = req.id;
    const startTime = req.startTime || Date.now();

    // Skip health check logs in production to reduce noise
    const isHealthCheck =
      originalUrl === '/api/v1/health' || originalUrl === '/health';
    const shouldLogRequest =
      process.env.NODE_ENV !== 'production' || !isHealthCheck;

    // Log incoming request
    if (shouldLogRequest) {
      this.logger.logRequest({
        method,
        url: originalUrl,
        reqId,
        ip,
        userAgent,
      });
    }

    // Capture response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const _contentLength = res.get('content-length');

      // Always log errors, skip health checks in prod
      if (shouldLogRequest || statusCode >= 400) {
        this.logger.logResponse({
          method,
          url: originalUrl,
          reqId,
          statusCode,
          duration,
        });
      }

      // Log slow requests (>1s) as warnings
      if (duration > 1000) {
        this.logger.warn('Slow request detected', {
          reqId,
          method,
          url: originalUrl,
          duration,
          threshold: 1000,
        });
      }
    });

    next();
  }
}

/**
 * Async Local Storage for request context propagation
 * Allows accessing request ID from anywhere in the call stack
 */
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  reqId: string;
  startTime: number;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Request Context Middleware
 *
 * Uses AsyncLocalStorage to propagate request context through
 * the entire call stack without explicit parameter passing.
 *
 * @example
 * ```typescript
 * // In any service or function
 * import { requestContext } from './request-context.middleware';
 *
 * const ctx = requestContext.getStore();
 * console.log(ctx?.reqId); // Access request ID
 * ```
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const context: RequestContext = {
      reqId: req.id,
      startTime: req.startTime || Date.now(),
    };

    requestContext.run(context, () => {
      next();
    });
  }
}

/**
 * Get current request context (if available)
 */
export function getCurrentRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Get current request ID (convenience function)
 */
export function getCurrentRequestId(): string | undefined {
  return requestContext.getStore()?.reqId;
}
