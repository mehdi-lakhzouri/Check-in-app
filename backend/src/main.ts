import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters';
import { PinoLoggerService } from './common/logger';
import helmet from 'helmet';

async function bootstrap() {
  // Create Pino logger instance for bootstrap
  const logger = new PinoLoggerService();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // Use Pino logger for NestJS internal logging
    logger: process.env.NODE_ENV === 'production' 
      ? logger 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
    bufferLogs: true,
  });

  // Use Pino as the app logger
  if (process.env.NODE_ENV === 'production') {
    app.useLogger(logger);
  }

  // Get ConfigService for Redis adapter
  const configService = app.get(ConfigService);

  // Configure Redis adapter for Socket.IO (horizontal scaling)
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  // Global validation pipe with transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IASTAM Check-in API')
    .setDescription('Conference attendance and check-in management system API')
    .setVersion('1.0')
    .addTag('sessions', 'Session management endpoints')
    .addTag('participants', 'Participant management endpoints')
    .addTag('registrations', 'Registration management endpoints')
    .addTag('checkins', 'Check-in operations endpoints')
    .addTag('reports', 'Reporting endpoints')
    .addTag('bulk', 'Bulk operations endpoints')
    .addTag('travel-grants', 'Travel grant management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  // Use structured logging for startup messages
  logger.log('Application started successfully', {
    port,
    environment: process.env.NODE_ENV || 'development',
    swagger: `http://localhost:${port}/api/docs`,
    apiBase: `http://localhost:${port}/api/v1`,
  });

  // Keep pretty console output for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
    console.log(`🔗 API Base URL: http://localhost:${port}/api/v1\n`);
  }
}
void bootstrap();
