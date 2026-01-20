/**
 * Mock Factories
 * Factory functions to create mock instances for testing
 */

import { Types } from 'mongoose';

/**
 * Creates a mock Mongoose document with save, toObject, etc.
 */
export function createMockDocument<T extends Record<string, unknown>>(
  data: T,
): T & {
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
    removeParticipantFromAllReferrals: jest.fn().mockResolvedValue(undefined),
    findByStatus: jest.fn().mockResolvedValue([]),
    findAmbassadors: jest.fn().mockResolvedValue([]),
    getAmbassadorLeaderboard: jest.fn().mockResolvedValue([]),
    addReferredParticipant: jest.fn(),
    removeReferredParticipant: jest.fn(),
    updateAmbassadorPoints: jest.fn(),
    getTravelGrantApplications: jest.fn().mockResolvedValue([]),
    getTravelGrantStats: jest.fn(),
    findByOrganization: jest.fn().mockResolvedValue([]),
    searchAmbassadors: jest.fn(),
    searchTravelGrants: jest.fn(),
    findAllTravelGrantApplicants: jest.fn().mockResolvedValue([]),
    findOrganizationMembers: jest.fn().mockResolvedValue([]),
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

/**
 * CheckInAttempt Repository Mock Factory
 */
export function createMockCheckInAttemptRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findWithFilters: jest.fn(),
    findBySession: jest.fn(),
    findByParticipant: jest.fn(),
    countBySession: jest.fn(),
    getStats: jest.fn(),
  };
}

/**
 * ParticipantsService Mock Factory
 */
export function createMockParticipantsService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByQrCode: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateQrCode: jest.fn(),
    getQrCodeDataUrl: jest.fn(),
    bulkCreate: jest.fn(),
    getStats: jest.fn(),
    getAmbassadorLeaderboard: jest.fn(),
    getAmbassadorActivity: jest.fn(),
    calculateAmbassadorPoints: jest.fn(),
    addReferredParticipant: jest.fn(),
    removeReferredParticipant: jest.fn(),
    syncOrganizationReferrals: jest.fn(),
    syncAllAmbassadorReferrals: jest.fn(),
    getTravelGrantApplications: jest.fn(),
  };
}

/**
 * SessionsService Mock Factory
 */
export function createMockSessionsService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggleOpen: jest.fn(),
    getUpcoming: jest.fn(),
    getStats: jest.fn(),
    incrementCheckInCount: jest.fn(),
    decrementCheckInCount: jest.fn(),
    reserveCapacitySlot: jest.fn(),
    releaseCapacitySlot: jest.fn(),
    incrementCheckInCountWithCapacity: jest.fn(),
    syncCapacityCounters: jest.fn(),
    getCapacityStatus: jest.fn(),
    reconcileCheckInCount: jest.fn(),
    bulkCreate: jest.fn(),
  };
}

/**
 * RegistrationsService Mock Factory
 */
export function createMockRegistrationsService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByParticipant: jest.fn(),
    findBySession: jest.fn(),
    findByParticipantAndSession: jest.fn(),
    isParticipantRegistered: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeBySession: jest.fn(),
    removeByParticipant: jest.fn(),
    countBySession: jest.fn(),
    getStats: jest.fn(),
  };
}

/**
 * CheckInsService Mock Factory
 */
export function createMockCheckInsService() {
  return {
    verifyQr: jest.fn(),
    acceptCheckIn: jest.fn(),
    declineCheckIn: jest.fn(),
    getAttempts: jest.fn(),
    getAttemptStats: jest.fn(),
    create: jest.fn(),
    checkInByQr: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByParticipant: jest.fn(),
    findBySession: jest.fn(),
    remove: jest.fn(),
    removeBySession: jest.fn(),
    removeByParticipant: jest.fn(),
    getStats: jest.fn(),
    getRecentCheckIns: jest.fn(),
    countBySession: jest.fn(),
    isCheckedIn: jest.fn(),
    reconcileAllSessionCounts: jest.fn(),
  };
}
