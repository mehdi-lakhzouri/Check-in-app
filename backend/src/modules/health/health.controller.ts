import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    name: string;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({
    description: 'Application health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected'] },
            name: { type: 'string' },
          },
        },
        memory: {
          type: 'object',
          properties: {
            heapUsed: { type: 'string' },
            heapTotal: { type: 'string' },
            rss: { type: 'string' },
          },
        },
      },
    },
  })
  check(): HealthCheckResponse {
    const memoryUsage = process.memoryUsage();

    const formatBytes = (bytes: number): string => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };

    return {
      status: this.connection.readyState === 1 ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: this.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: this.connection.name,
      },
      memory: {
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        rss: formatBytes(memoryUsage.rss),
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Application is live' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'Application is ready' })
  ready(): { status: string; database: string } {
    const dbReady = this.connection.readyState === 1;
    return {
      status: dbReady ? 'ok' : 'error',
      database: dbReady ? 'connected' : 'disconnected',
    };
  }
}
