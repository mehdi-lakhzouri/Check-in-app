import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLoggerService } from '../logger';

/**
 * Redis IO Adapter for Socket.IO
 *
 * Enables horizontal scaling of WebSocket connections across multiple
 * server instances by using Redis Pub/Sub for message broadcasting.
 *
 * Features:
 * - Connection verification with ping before use
 * - Automatic reconnection with retry strategy
 * - Graceful fallback to in-memory adapter if Redis unavailable
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger: PinoLoggerService;
  private isConnected = false;

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
    this.logger = new PinoLoggerService();
    this.logger.setContext(RedisIoAdapter.name);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    try {
      const pubClient = createClient({
        socket: {
          host,
          port,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              this.logger.error('Socket.IO Redis adapter max retries reached');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
          connectTimeout: 10000,
        },
        ...(password ? { password } : {}),
      });

      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.logger.error(`Redis Pub Client Error: ${err.message}`);
        this.isConnected = false;
      });

      subClient.on('error', (err) => {
        this.logger.error(`Redis Sub Client Error: ${err.message}`);
        this.isConnected = false;
      });

      pubClient.on('ready', () => {
        this.logger.log('Redis Pub Client ready');
      });

      subClient.on('ready', () => {
        this.logger.log('Redis Sub Client ready');
      });

      // Connect both clients
      await Promise.all([pubClient.connect(), subClient.connect()]);

      // Verify connections are ready with ping
      await Promise.all([pubClient.ping(), subClient.ping()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.isConnected = true;
      this.logger.log(
        '✅ Socket.IO Redis adapter connected - horizontal scaling enabled',
      );
    } catch (error) {
      this.logger.warn(`⚠️ Redis adapter connection failed: ${error.message}`);
      this.logger.warn(
        'Falling back to in-memory adapter (single instance mode)',
      );
      this.adapterConstructor = null;
      this.isConnected = false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:3000',
          'http://localhost:3001',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    if (this.adapterConstructor && this.isConnected) {
      server.adapter(this.adapterConstructor);
      this.logger.log('Socket.IO server using Redis adapter');
    } else {
      this.logger.warn('Socket.IO server using in-memory adapter');
    }

    return server;
  }
}
