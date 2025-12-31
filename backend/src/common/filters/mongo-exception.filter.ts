import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch(MongooseError)
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoExceptionFilter.name);

  catch(exception: MongooseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';
    let errors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = Object.keys(exception.errors).map((key) => ({
        field: key,
        message: exception.errors[key].message,
      }));
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ${exception.path}: ${exception.value}`;
    } else if (exception instanceof MongooseError.DocumentNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Document not found';
    } else if (exception.name === 'MongoServerError') {
      const mongoError = exception as unknown as { code: number; keyPattern?: Record<string, unknown> };
      if (mongoError.code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'Duplicate entry';
        if (mongoError.keyPattern) {
          const field = Object.keys(mongoError.keyPattern)[0];
          errors = [{ field, message: `${field} already exists` }];
        }
      }
    }

    this.logger.error(`MongoDB Error: ${message}`, exception.stack);

    response.status(status).json({
      status: 'error',
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}
