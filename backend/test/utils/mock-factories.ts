/**
 * Mock Factories
 * Factory functions to create mock instances for testing
 */

import { Types } from 'mongoose';

/**
 * Creates a mock Mongoose document with save, toObject, etc.
 */
export function createMockDocument<T extends Record<string, unknown>>(data: T): T & {
  _id: Types.ObjectId;
  save: jest.Mock;
  toObject: jest.Mock;
  toJSON: jest.Mock;
  populate: jest.Mock;
  execPopulate: jest.Mock;
} {
  return {
    ...data,
    _id: (data._id as Types.ObjectId) || new Types.ObjectId(),
    save: jest.fn().mockResolvedValue(data),
    toObject: jest.fn().mockReturnValue(data),
    toJSON: jest.fn().mockReturnValue(data),
    populate: jest.fn().mockReturnThis(),
    execPopulate: jest.fn().mockResolvedValue(data),
  };
}

/**
 * Creates a mock Mongoose Model
 */
export function createMockModel() {
  return {
    new: jest.fn(),
    constructor: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    create: jest.fn(),
    insertMany: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    populate: jest.fn(),
    exec: jest.fn(),
  };
}

/**
 * Session Repository Mock Factory
 */
export function createMockSessionRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findWithFilters: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findUpcoming: jest.fn(),
    getSessionStats: jest.fn(),
    incrementCheckInCount: jest.fn(),
    decrementCheckInCount: jest.fn(),
  };
}

/**
 * Participant Repository Mock Factory
 */
export function createMockParticipantRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByQrCode: jest.fn(),
    findWithFilters: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findByIds: jest.fn(),
    countDocuments: jest.fn(),
    getParticipantStats: jest.fn(),
  };
}

/**
 * CheckIn Repository Mock Factory
 */
export function createMockCheckInRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findWithFilters: jest.fn(),
    findWithPopulate: jest.fn(),
    findByParticipantAndSession: jest.fn(),
    findByParticipant: jest.fn(),
    findBySession: jest.fn(),
    deleteById: jest.fn(),
    getCheckInStats: jest.fn(),
  };
}

/**
 * Registration Repository Mock Factory
 */
export function createMockRegistrationRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findWithFilters: jest.fn(),
    findWithPopulate: jest.fn(),
    findByParticipantAndSession: jest.fn(),
    findByParticipant: jest.fn(),
    findBySession: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    deleteBySession: jest.fn(),
    deleteByParticipant: jest.fn(),
    countBySession: jest.fn(),
    getRegistrationStats: jest.fn(),
  };
}

/**
 * ConfigService Mock
 */
export function createMockConfigService(): {
  get: jest.Mock;
} {
  return {
    get: jest.fn(<T = unknown>(key: string, defaultValue?: T): T => {
      const config: Record<string, unknown> = {
        'app.checkinLateThresholdMinutes': 10,
        'database.uri': 'mongodb://localhost:27017/test',
        PORT: 3000,
      };
      return (config[key] ?? defaultValue) as T;
    }),
  };
}
