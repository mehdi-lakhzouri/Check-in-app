/**
 * Test Utilities
 * Common utilities and helper functions for tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import mongoose, { Model, Types } from 'mongoose';
import { ParticipantStatus } from '../../src/modules/participants/schemas';
import { CheckInMethod } from '../../src/modules/checkins/schemas';
import { RegistrationStatus } from '../../src/modules/registrations/schemas';
import { CreateParticipantDto } from '../../src/modules/participants/dto';
import { CreateCheckInDto } from '../../src/modules/checkins/dto';
import { CreateRegistrationDto } from '../../src/modules/registrations/dto';

/**
 * Generate a valid MongoDB ObjectId
 */
export function generateObjectId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Generate mock data for testing
 */
export const mockData = {
  /**
   * Generate a mock session
   */
  session: (overrides: Record<string, any> = {}) => ({
    _id: generateObjectId(),
    name: 'Test Session',
    description: 'A test session description',
    startTime: new Date('2026-01-15T09:00:00Z'),
    endTime: new Date('2026-01-15T10:00:00Z'),
    location: 'Test Room A',
    isOpen: false,
    capacity: 100,
    checkInsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Generate a mock participant
   */
  participant: (overrides: Record<string, any> = {}) => ({
    _id: generateObjectId(),
    name: 'John Doe',
    email: `test-${Date.now()}@example.com`,
    organization: 'Test Organization',
    phone: '+1234567890',
    qrCode: `QR-${Date.now().toString(36).toUpperCase()}`,
    status: ParticipantStatus.REGULAR,
    isActive: true,
    ambassadorPoints: 0,
    referredParticipantIds: [],
    travelGrantApplied: false,
    travelGrantApproved: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Generate a mock check-in
   */
  checkIn: (participantId?: string, sessionId?: string, overrides: Record<string, any> = {}) => ({
    _id: generateObjectId(),
    participantId: participantId || generateObjectId(),
    sessionId: sessionId || generateObjectId(),
    checkInTime: new Date(),
    method: CheckInMethod.MANUAL,
    isLate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Generate a mock registration
   */
  registration: (participantId?: string, sessionId?: string, overrides: Record<string, any> = {}) => ({
    _id: generateObjectId(),
    participantId: participantId || generateObjectId(),
    sessionId: sessionId || generateObjectId(),
    status: RegistrationStatus.CONFIRMED,
    registrationDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Generate CreateSessionDto
   */
  createSessionDto: (overrides: Record<string, any> = {}) => ({
    name: 'Test Session',
    description: 'Test description',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
    location: 'Test Room',
    isOpen: false,
    capacity: 50,
    ...overrides,
  }),

  /**
   * Generate CreateParticipantDto - returns properly typed DTO
   */
  createParticipantDto: (overrides: Partial<CreateParticipantDto> = {}): CreateParticipantDto => ({
    name: 'Test Participant',
    email: `test-${Date.now()}@example.com`,
    organization: 'Test Org',
    phone: '+1234567890',
    status: ParticipantStatus.REGULAR,
    isActive: true,
    ...overrides,
  }),

  /**
   * Generate CreateCheckInDto - returns properly typed DTO
   */
  createCheckInDto: (participantId: string, sessionId: string, overrides: Partial<CreateCheckInDto> = {}): CreateCheckInDto => ({
    participantId,
    sessionId,
    method: CheckInMethod.MANUAL,
    ...overrides,
  }),

  /**
   * Generate CreateRegistrationDto - returns properly typed DTO
   */
  createRegistrationDto: (participantId: string, sessionId: string, overrides: Partial<CreateRegistrationDto> = {}): CreateRegistrationDto => ({
    participantId,
    sessionId,
    status: RegistrationStatus.CONFIRMED,
    ...overrides,
  }),
};

/**
 * Create a mock repository with common methods
 */
export function createMockRepository<T>() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findWithFilters: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    countDocuments: jest.fn(),
  };
}

/**
 * Create a mock service with Jest functions
 */
export function createMockService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

/**
 * Wait for a specified time (useful in async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that an error is thrown with expected properties
 */
export async function expectError(
  fn: () => Promise<any>,
  expectedStatus?: number,
  expectedMessagePart?: string,
): Promise<void> {
  try {
    await fn();
    fail('Expected function to throw an error');
  } catch (error: any) {
    if (expectedStatus) {
      expect(error.status || error.getStatus?.()).toBe(expectedStatus);
    }
    if (expectedMessagePart) {
      expect(error.message).toContain(expectedMessagePart);
    }
  }
}
