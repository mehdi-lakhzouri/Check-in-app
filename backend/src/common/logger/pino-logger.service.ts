import { LoggerService, Injectable, Scope } from '@nestjs/common';
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  reqId?: string;
  userId?: string;
  sessionId?: string;
  participantId?: string;
  operation?: string;
  entity?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Environment-aware log level configuration
 */
const LOG_LEVELS: Record<string, string> = {
  development: 'debug',
  test: 'warn',
  staging: 'info',
  production: 'warn',
};

/**
 * Pino configuration for production-grade logging
 */
function createPinoOptions(): LoggerOptions {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const baseOptions: LoggerOptions = {
    level: LOG_LEVELS[nodeEnv] || 'info',

    // Custom serializers for security and performance
    serializers: {
      // Redact sensitive fields
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers?.host,
          'user-agent': req.headers?.['user-agent'],
          'content-type': req.headers?.['content-type'],
          // Never log authorization headers
        },
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },

    // Redact sensitive data paths
    redact: {
      paths: [
        'password',
        'token',
        'secret',
        'authorization',
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.token',
      ],
      censor: '[REDACTED]',
    },

    // Add base context to all logs
    base: {
      service: 'checkin-api',
      version: process.env.npm_package_version || '1.0.0',
      env: nodeEnv,
    },

    // Timestamp format
    timestamp: () => `,"time":${Date.now()}`,
  };

  if (isProduction) {
    // Production: Pure JSON output for log aggregators
    return {
      ...baseOptions,
      // Disable pretty print in production
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({
          pid: bindings.pid,
          hostname: bindings.hostname,
        }),
      },
    };
  } else {
    // Development: Human-readable output
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    };
  }
}

/**
 * Singleton Pino instance for the application
 */
let pinoInstance: PinoLogger | null = null;

function getPinoInstance(): PinoLogger {
  if (!pinoInstance) {
    pinoInstance = pino(createPinoOptions());
  }
  return pinoInstance;
}

/**
 * Production-grade Pino Logger Service
 *
 * Features:
 * - Structured JSON logging for production
 * - Pretty console output for development
 * - Environment-aware log levels
 * - Sensitive data redaction
 * - Non-blocking async I/O
 * - Correlation ID support
 * - High performance (Pino is 5x faster than Winston)
 *
 * @example
 * ```typescript
 * // Basic usage
 * this.logger.log('User created', { userId: '123' });
 *
 * // With context
 * this.logger.setContext('UsersService');
 * this.logger.log('Finding users', { filters: { active: true } });
 *
 * // Error logging with stack trace
 * this.logger.error('Failed to create user', error.stack, { email });
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class PinoLoggerService implements LoggerService {
  private context: string = 'Application';
  private readonly pino: PinoLogger;

  constructor() {
    this.pino = getPinoInstance();
  }

  /**
   * Set the logging context (typically the class name)
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(bindings: LogContext): PinoLoggerService {
    const childLogger = new PinoLoggerService();
    (childLogger as any).pino = this.pino.child(bindings);
    childLogger.context = this.context;
    return childLogger;
  }

  /**
   * Parse message and optional context from NestJS logger format
   */
  private parseMessage(
    message: any,
    optionalParams: any[],
  ): { msg: string; context: LogContext } {
    let msg: string;
    let context: LogContext = {};

    // Handle different message types
    if (typeof message === 'string') {
      msg = message;
    } else if (typeof message === 'object') {
      msg = message.msg || message.message || JSON.stringify(message);
      context = { ...message };
      delete context.msg;
      delete context.message;
    } else {
      msg = String(message);
    }

    // Parse optional params (NestJS pattern: message, context/error, contextName)
    for (const param of optionalParams) {
      if (typeof param === 'string' && !context.context) {
        // Last string param is often the context name in NestJS
        context.context = param;
      } else if (typeof param === 'object' && param !== null) {
        // Merge object params
        if (param instanceof Error) {
          context.error = param.message;
          context.stack = param.stack;
        } else {
          Object.assign(context, param);
        }
      }
    }

    return { msg, context };
  }

  /**
   * Log at info level (standard operations)
   */
  log(message: any, ...optionalParams: any[]): void {
    const { msg, context } = this.parseMessage(message, optionalParams);
    this.pino.info({ context: this.context, ...context }, msg);
  }

  /**
   * Log at error level (failures and exceptions)
   */
  error(message: any, trace?: string, ...optionalParams: any[]): void {
    const { msg, context } = this.parseMessage(message, optionalParams);

    // Handle trace parameter (NestJS convention)
    if (trace && typeof trace === 'string') {
      context.stack = trace;
    }

    this.pino.error({ context: this.context, ...context }, msg);
  }

  /**
   * Log at warn level (non-critical issues)
   */
  warn(message: any, ...optionalParams: any[]): void {
    const { msg, context } = this.parseMessage(message, optionalParams);
    this.pino.warn({ context: this.context, ...context }, msg);
  }

  /**
   * Log at debug level (development/troubleshooting)
   */
  debug(message: any, ...optionalParams: any[]): void {
    const { msg, context } = this.parseMessage(message, optionalParams);
    this.pino.debug({ context: this.context, ...context }, msg);
  }

  /**
   * Log at trace level (verbose debugging)
   */
  verbose(message: any, ...optionalParams: any[]): void {
    const { msg, context } = this.parseMessage(message, optionalParams);
    this.pino.trace({ context: this.context, ...context }, msg);
  }

  /**
   * Log at fatal level (system failures requiring immediate attention)
   */
  fatal(message: any, ...optionalParams: any[]): void {
    const { msg, context } = this.parseMessage(message, optionalParams);
    this.pino.fatal({ context: this.context, ...context }, msg);
  }

  // =========================================
  // Extended Logging Methods for Production
  // =========================================

  /**
   * Log HTTP request entry
   */
  logRequest(req: {
    method: string;
    url: string;
    reqId: string;
    ip?: string;
    userAgent?: string;
  }): void {
    this.pino.info(
      {
        context: 'HTTP',
        type: 'request',
        ...req,
      },
      `→ ${req.method} ${req.url}`,
    );
  }

  /**
   * Log HTTP response
   */
  logResponse(res: {
    method: string;
    url: string;
    reqId: string;
    statusCode: number;
    duration: number;
  }): void {
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    this.pino[level](
      {
        context: 'HTTP',
        type: 'response',
        ...res,
      },
      `← ${res.method} ${res.url} ${res.statusCode} ${res.duration}ms`,
    );
  }

  /**
   * Log database operation with timing
   */
  logDbOperation(operation: {
    type: 'query' | 'insert' | 'update' | 'delete' | 'aggregate';
    collection: string;
    duration: number;
    success: boolean;
    error?: string;
  }): void {
    const level = operation.success ? 'debug' : 'error';

    this.pino[level](
      {
        context: 'MongoDB',
        ...operation,
      },
      `DB ${operation.type.toUpperCase()} on ${operation.collection} (${operation.duration}ms)`,
    );
  }

  /**
   * Log Redis operation with timing
   */
  logRedisOperation(operation: {
    command: string;
    key?: string;
    duration: number;
    hit?: boolean;
    error?: string;
  }): void {
    const level = operation.error ? 'warn' : 'debug';

    this.pino[level](
      {
        context: 'Redis',
        ...operation,
      },
      `Redis ${operation.command}${operation.key ? ` ${operation.key}` : ''} (${operation.duration}ms)${operation.hit !== undefined ? ` [${operation.hit ? 'HIT' : 'MISS'}]` : ''}`,
    );
  }

  /**
   * Log Bull job lifecycle
   */
  logJob(job: {
    event: 'started' | 'completed' | 'failed' | 'stalled';
    queue: string;
    jobId: string | number;
    jobType?: string;
    duration?: number;
    error?: string;
    attempts?: number;
  }): void {
    const levelMap = {
      started: 'info' as const,
      completed: 'info' as const,
      failed: 'error' as const,
      stalled: 'warn' as const,
    };

    this.pino[levelMap[job.event]](
      {
        context: 'BullQueue',
        ...job,
      },
      `Job ${job.event}: ${job.queue}/${job.jobId}${job.jobType ? ` (${job.jobType})` : ''}`,
    );
  }

  /**
   * Log WebSocket events
   */
  logWebSocket(event: {
    type:
      | 'connect'
      | 'disconnect'
      | 'subscribe'
      | 'unsubscribe'
      | 'emit'
      | 'error';
    clientId: string;
    room?: string;
    event?: string;
    error?: string;
  }): void {
    const level = event.type === 'error' ? 'error' : 'debug';

    this.pino[level](
      {
        context: 'WebSocket',
        ...event,
      },
      `WS ${event.type}: ${event.clientId}${event.room ? ` → ${event.room}` : ''}`,
    );
  }

  /**
   * Log security events (authentication, authorization)
   */
  logSecurity(event: {
    type:
      | 'auth_success'
      | 'auth_failure'
      | 'rate_limit'
      | 'forbidden'
      | 'suspicious';
    ip?: string;
    userId?: string;
    resource?: string;
    reason?: string;
  }): void {
    const levelMap = {
      auth_success: 'info' as const,
      auth_failure: 'warn' as const,
      rate_limit: 'warn' as const,
      forbidden: 'warn' as const,
      suspicious: 'error' as const,
    };

    this.pino[levelMap[event.type]](
      {
        context: 'Security',
        ...event,
      },
      `Security ${event.type}${event.reason ? `: ${event.reason}` : ''}`,
    );
  }

  /**
   * Log business metrics
   */
  logMetric(metric: {
    name: string;
    value: number;
    unit?: string;
    tags?: Record<string, string>;
  }): void {
    this.pino.info(
      {
        context: 'Metrics',
        type: 'metric',
        ...metric,
      },
      `Metric: ${metric.name}=${metric.value}${metric.unit || ''}`,
    );
  }
}

/**
 * Get a child logger with request context
 */
export function createRequestLogger(
  baseLogger: PinoLoggerService,
  reqId: string,
  additionalContext?: LogContext,
): PinoLoggerService {
  return baseLogger.child({
    reqId,
    ...additionalContext,
  });
}

/**
 * Export the raw Pino instance for advanced usage
 */
export function getRawPinoLogger(): PinoLogger {
  return getPinoInstance();
}
