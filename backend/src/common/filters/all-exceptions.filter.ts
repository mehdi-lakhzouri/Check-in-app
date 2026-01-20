import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLoggerService, PINO_LOGGER, getCurrentRequestId } from '../logger';

interface RequestWithId extends Request {
  id?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: PinoLoggerService;

  constructor(@Inject(PINO_LOGGER) logger?: PinoLoggerService) {
    this.logger = logger || new PinoLoggerService();
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const reqId = request.id || getCurrentRequestId() || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Array<{ field: string; message: string }> | undefined;
    let errorCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        errorCode = responseObj.error as string;

        // Handle validation errors from class-validator
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          errors = this.formatValidationErrors(responseObj.message);
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      status: 'error' as const,
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Structured error logging for all environments
    const logPayload = {
      reqId,
      method: request.method,
      url: request.url,
      statusCode: status,
      errorCode,
      message,
      errors,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // Log based on severity
    if (status >= 500) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : undefined,
        logPayload,
      );
    } else if (status >= 400) {
      this.logger.warn('Client error', logPayload);
    }

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(
    messages: string[],
  ): Array<{ field: string; message: string }> {
    return messages.map((msg) => {
      // Try to extract field name from validation message
      const match = msg.match(/^(\w+)\s/);
      return {
        field: match ? match[1] : 'unknown',
        message: msg,
      };
    });
  }
}
