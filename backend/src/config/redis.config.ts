import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,

  // Cache TTL defaults (in milliseconds)
  cache: {
    // Participant cache - longer TTL since participant data rarely changes
    participantTtl: parseInt(process.env.REDIS_PARTICIPANT_TTL || '600000', 10), // 10 minutes

    // Session cache - shorter TTL since sessions can change status
    sessionTtl: parseInt(process.env.REDIS_SESSION_TTL || '60000', 10), // 1 minute

    // Statistics cache - moderate TTL with refresh on changes
    statsTtl: parseInt(process.env.REDIS_STATS_TTL || '30000', 10), // 30 seconds

    // Capacity cache - very short TTL for accuracy
    capacityTtl: parseInt(process.env.REDIS_CAPACITY_TTL || '5000', 10), // 5 seconds
  },
}));
