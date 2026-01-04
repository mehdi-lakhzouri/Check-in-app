# Backend Tests

This directory contains all tests for the Check-in App backend.

## Test Structure

```
test/
├── setup.ts                    # Global test setup
├── jest-e2e.json               # E2E test configuration
├── utils/                      # Shared test utilities
│   ├── index.ts                # Barrel export
│   ├── test-utils.ts           # Test utilities and mock data
│   └── mock-factories.ts       # Factory functions for mocks
├── unit/                       # Unit tests
│   ├── sessions/
│   │   └── sessions.service.spec.ts
│   ├── participants/
│   │   └── participants.service.spec.ts
│   ├── checkins/
│   │   └── checkins.service.spec.ts
│   └── registrations/
│       └── registrations.service.spec.ts
└── e2e/                        # End-to-end tests
    ├── sessions/
    │   └── sessions.e2e-spec.ts
    ├── participants/
    │   └── participants.e2e-spec.ts
    ├── checkins/
    │   └── checkins.e2e-spec.ts
    └── registrations/
        └── registrations.e2e-spec.ts
```

## Running Tests

### Unit Tests
Unit tests are isolated tests for individual services with mocked dependencies.

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:cov
```

### E2E Tests
E2E tests use an in-memory MongoDB instance to test API endpoints.

```bash
# Run all E2E tests
npm run test:e2e
```

### All Tests
```bash
# Run both unit and E2E tests
npm run test:all
```

## Test Utilities

### Mock Data (`test/utils/test-utils.ts`)

The `mockData` object provides factory functions for generating test data:

```typescript
import { mockData, generateObjectId } from '../utils/test-utils';

// Generate mock entities
const session = mockData.session({ name: 'Custom Name' });
const participant = mockData.participant({ email: 'test@example.com' });
const checkIn = mockData.checkIn(participantId, sessionId);
const registration = mockData.registration(participantId, sessionId);

// Generate DTOs
const createSessionDto = mockData.createSessionDto();
const createParticipantDto = mockData.createParticipantDto();
```

### Mock Factories (`test/utils/mock-factories.ts`)

Factory functions to create mock repositories and services:

```typescript
import { 
  createMockSessionRepository,
  createMockParticipantRepository,
  createMockCheckInRepository,
  createMockRegistrationRepository,
  createMockConfigService,
} from '../utils/mock-factories';

const mockRepo = createMockSessionRepository();
mockRepo.findById.mockResolvedValue(mockSession);
```

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../src/modules/sessions/services/sessions.service';
import { SessionRepository } from '../../../src/modules/sessions/repositories/session.repository';
import { createMockSessionRepository } from '../../utils/mock-factories';
import { mockData, generateObjectId } from '../../utils/test-utils';

describe('SessionsService', () => {
  let service: SessionsService;
  let repository: ReturnType<typeof createMockSessionRepository>;

  beforeEach(async () => {
    repository = createMockSessionRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SessionRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should create a session successfully', async () => {
    const createDto = mockData.createSessionDto();
    const expectedSession = mockData.session({ name: createDto.name });
    repository.create.mockResolvedValue(expectedSession);

    const result = await service.create(createDto);

    expect(result).toEqual(expectedSession);
  });
});
```

### E2E Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        SessionsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'api/v',
      defaultVersion: '1',
    });
    await app.init();
  });

  it('should create a session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sessions')
      .send({ name: 'Test', startTime: '...', endTime: '...' })
      .expect(201);

    expect(response.body.data.name).toBe('Test');
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests.
2. **Clean State**: Use `beforeEach` and `afterEach` to reset state between tests.
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested.
4. **AAA Pattern**: Follow Arrange, Act, Assert pattern in tests.
5. **Mock External Dependencies**: Unit tests should mock all external dependencies.
6. **Test Edge Cases**: Include tests for error conditions and edge cases.
7. **Keep Tests Fast**: Unit tests should run quickly; E2E tests can be slower.

## Coverage

Generate coverage reports:

```bash
npm run test:cov
```

Coverage reports are saved to the `coverage/` directory.
