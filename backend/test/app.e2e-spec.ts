import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createE2ETestApp,
  closeE2ETestApp,
  E2ETestContext,
} from './utils/e2e-test-setup';

describe('AppController (e2e)', () => {
  let context: E2ETestContext;
  let app: INestApplication;

  beforeAll(async () => {
    context = await createE2ETestApp();
    app = context.app;
  }, 60000);

  afterAll(async () => {
    await closeE2ETestApp(context);
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
});
