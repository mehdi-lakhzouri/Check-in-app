import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super(
      {
        status: 'error',
        message,
        errors,
        statusCode: status,
      },
      status,
    );
  }
}

export class EntityNotFoundException extends NotFoundException {
  constructor(entity: string, id?: string) {
    super({
      status: 'error',
      message: id ? `${entity} with ID ${id} not found` : `${entity} not found`,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class EntityExistsException extends ConflictException {
  constructor(entity: string, field: string, value: string) {
    super({
      status: 'error',
      message: `${entity} with ${field} "${value}" already exists`,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class ValidationException extends BadRequestException {
  constructor(errors: Array<{ field: string; message: string }>) {
    super({
      status: 'error',
      message: 'Validation failed',
      errors,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class DatabaseException extends InternalServerErrorException {
  constructor(operation: string) {
    super({
      status: 'error',
      message: `Database error during ${operation}`,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export class FileUploadException extends BadRequestException {
  constructor(message: string) {
    super({
      status: 'error',
      message: `File upload error: ${message}`,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RateLimitException extends HttpException {
  constructor() {
    super(
      {
        status: 'error',
        message: 'Too many requests. Please try again later.',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  UnauthorizedException,
};
