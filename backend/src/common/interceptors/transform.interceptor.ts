import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ResponseFormat<T> {
  status: 'success';
  message: string;
  data: T;
  timestamp: string;
  path: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseFormat<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;

    return next.handle().pipe(
      map((responseData) => {
        // If the response already has our format, return it
        if (
          responseData?.status === 'success' ||
          responseData?.status === 'error'
        ) {
          return {
            ...responseData,
            timestamp: responseData.timestamp || new Date().toISOString(),
            path: responseData.path || path,
          };
        }

        // Handle paginated responses
        if (responseData?.data && responseData?.meta) {
          return {
            status: 'success' as const,
            message: responseData.message || 'Success',
            data: responseData.data,
            meta: responseData.meta,
            timestamp: new Date().toISOString(),
            path,
          };
        }

        // Standard response
        return {
          status: 'success' as const,
          message: 'Success',
          data: responseData,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }
}
