import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

export class ApiResponse<T> {
  @ApiProperty({ example: 'success' })
  status: 'success' | 'error';

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ type: ApiResponseMeta })
  meta?: ApiResponseMeta;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiPropertyOptional({ example: '/api/v1/sessions' })
  path?: string;
}

export class PaginatedResponse<T> extends ApiResponse<T[]> {
  @ApiProperty({ type: ApiResponseMeta })
  declare meta: ApiResponseMeta;
}

export class ErrorResponse {
  @ApiProperty({ example: 'error' })
  status: 'error';

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional({ example: 400 })
  statusCode?: number;

  @ApiPropertyOptional({
    example: [{ field: 'email', message: 'Invalid email format' }],
  })
  errors?: Array<{ field: string; message: string }>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiPropertyOptional({ example: '/api/v1/sessions' })
  path?: string;
}
