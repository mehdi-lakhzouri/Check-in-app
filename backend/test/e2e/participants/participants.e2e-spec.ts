/**
 * Participants E2E Tests
 * End-to-end tests for the Participants API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Connection } from 'mongoose';
import { ParticipantsModule } from '../../../src/modules/participants/participants.module';
import { mockData } from '../../utils/test-utils';
import { ParticipantStatus } from '../../../src/modules/participants/schemas';

describe('Participants (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRoot(mongoUri),
        ParticipantsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'api/v',
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
    await app.close();
  });

  afterEach(async () => {
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('POST /api/v1/participants', () => {
    it('should create a new participant', async () => {
      const createDto = mockData.createParticipantDto();

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(createDto)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(createDto.name);
      expect(response.body.data.email).toBe(createDto.email);
      expect(response.body.data).toHaveProperty('qrCode');
    });

    it('should return 400 for invalid email', async () => {
      const invalidDto = {
        name: 'Test User',
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidDto = {
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const createDto = mockData.createParticipantDto({
        email: 'duplicate@example.com',
      });

      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(createDto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send({ ...createDto, name: 'Different Name' })
        .expect(409);
    });

    it('should auto-generate QR code when not provided', async () => {
      const createDto = mockData.createParticipantDto();

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(createDto)
        .expect(201);

      expect(response.body.data.qrCode).toMatch(/^QR-[A-Z0-9-]+$/);
    });

    it('should create participant with different statuses', async () => {
      const ambassadorDto = mockData.createParticipantDto({
        status: ParticipantStatus.AMBASSADOR,
        email: 'ambassador@example.com',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(ambassadorDto)
        .expect(201);

      expect(response.body.data.status).toBe(ParticipantStatus.AMBASSADOR);
    });
  });

  describe('GET /api/v1/participants', () => {
    beforeEach(async () => {
      const participants = [
        mockData.createParticipantDto({
          name: 'Alice Smith',
          email: 'alice@example.com',
        }),
        mockData.createParticipantDto({
          name: 'Bob Johnson',
          email: 'bob@example.com',
        }),
        mockData.createParticipantDto({
          name: 'Charlie Brown',
          email: 'charlie@example.com',
        }),
      ];

      for (const participant of participants) {
        await request(app.getHttpServer())
          .post('/api/v1/participants')
          .send(participant);
      }
    });

    it('should return all participants', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(3);
    });

    it('should return paginated results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(3);
    });

    it('should search by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .query({ search: 'Alice' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].name).toContain('Alice');
    });

    it('should filter by status', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({
            status: ParticipantStatus.AMBASSADOR,
            email: 'ambassador@example.com',
          }),
        );

      const response = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .query({ status: ParticipantStatus.AMBASSADOR })
        .expect(200);

      expect(
        response.body.data.every(
          (p: any) => p.status === ParticipantStatus.AMBASSADOR,
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/v1/participants/:id', () => {
    let participantId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ name: 'Test Participant' }));

      participantId = response.body.data._id;
    });

    it('should return a participant by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/participants/${participantId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(participantId);
      expect(response.body.data.name).toBe('Test Participant');
    });

    it('should return 404 for non-existent participant', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .get(`/api/v1/participants/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/participants/invalid-id')
        .expect(400);
    });
  });

  describe('GET /api/v1/participants/qr/:qrCode', () => {
    let participantQrCode: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ name: 'QR Test Participant' }));

      participantQrCode = response.body.data.qrCode;
    });

    it('should return a participant by QR code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/participants/qr/${participantQrCode}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.qrCode).toBe(participantQrCode);
      expect(response.body.data.name).toBe('QR Test Participant');
    });

    it('should return 404 for non-existent QR code', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/participants/qr/QR-NONEXISTENT')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/participants/:id', () => {
    let participantId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ name: 'Original Name' }));

      participantId = response.body.data._id;
    });

    it('should update a participant', async () => {
      const updateDto = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/participants/${participantId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 404 when updating non-existent participant', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .patch(`/api/v1/participants/${fakeId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should return 409 when updating email to existing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto({ email: 'existing@example.com' }));

      await request(app.getHttpServer())
        .patch(`/api/v1/participants/${participantId}`)
        .send({ email: 'existing@example.com' })
        .expect(409);
    });
  });

  describe('DELETE /api/v1/participants/:id', () => {
    let participantId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(mockData.createParticipantDto());

      participantId = response.body.data._id;
    });

    it('should delete a participant', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/participants/${participantId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/participants/${participantId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent participant', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app.getHttpServer())
        .delete(`/api/v1/participants/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/participants/stats', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({
            status: ParticipantStatus.REGULAR,
            email: 'regular1@example.com',
          }),
        );

      await request(app.getHttpServer())
        .post('/api/v1/participants')
        .send(
          mockData.createParticipantDto({
            status: ParticipantStatus.AMBASSADOR,
            email: 'ambassador1@example.com',
          }),
        );
    });

    it('should return participant statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/participants/stats')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
    });
  });
});
