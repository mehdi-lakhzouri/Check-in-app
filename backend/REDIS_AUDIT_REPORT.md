# Redis Caching Implementation Audit Report

**Project:** Check-in Application Backend  
**Date:** January 3, 2026  
**Auditor:** Senior Backend Performance Engineer  
**Target Concurrency:** 1,000 concurrent users  

---

## Executive Summary

This audit evaluates the Redis caching implementation for production readiness at scale. The implementation shows good foundational patterns but has **critical race conditions** that must be fixed before production deployment.

### Overall Scores

| Category | Score | Status |
|----------|-------|--------|
| Correctness | 5/10 | ⚠️ Needs Work |
| Concurrency Performance | 6/10 | ⚠️ Needs Work |
| Data Consistency Safety | 4/10 | 🔴 Critical |
| Memory Efficiency | 7/10 | ✅ Acceptable |
| Production Readiness | 4/10 | 🔴 Critical |

**Verdict:** NOT production-ready. Critical fixes required.

---

## Critical Issues (P0 - Must Fix Before Production)

### Issue #1: TOCTOU Race Condition in Capacity Check

**Severity:** 🔴 CRITICAL  
**Location:** `src/modules/sessions/sessions.service.ts` - `incrementCheckInCountWithCapacity()`  
**Impact:** Overbooking sessions, data corruption, inconsistent capacity counts

#### Problem Description

The current implementation has a Time-Of-Check-Time-Of-Use (TOCTOU) race condition:

```typescript
// CURRENT PROBLEMATIC CODE
async incrementCheckInCountWithCapacity(sessionId: string, capacity: number): Promise<boolean> {
  const counterKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
  
  // Step 1: Get current count (READ)
  const currentCount = await this.redisClient.get(counterKey);
  const count = currentCount ? parseInt(currentCount, 10) : 0;
  
  // ⚠️ RACE WINDOW: Another request can increment between read and write
  
  // Step 2: Check capacity (CHECK)
  if (count >= capacity) {
    return false;
  }
  
  // Step 3: Increment (WRITE)
  await this.redisClient.incr(counterKey);
  return true;
}
```

**Race Scenario:**
1. Request A reads count = 99 (capacity = 100)
2. Request B reads count = 99
3. Request A checks 99 < 100 ✓, increments to 100
4. Request B checks 99 < 100 ✓, increments to 101 ⚠️ OVERBOOKED

#### Recommended Fix

Use a **Lua script** for atomic check-and-increment:

```typescript
// FIXED CODE
private readonly INCREMENT_WITH_CAP_SCRIPT = `
  local current = tonumber(redis.call('GET', KEYS[1]) or '0')
  local capacity = tonumber(ARGV[1])
  if current >= capacity then
    return -1
  end
  return redis.call('INCR', KEYS[1])
`;

async incrementCheckInCountWithCapacity(sessionId: string, capacity: number): Promise<boolean> {
  const counterKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
  
  try {
    const result = await this.redisClient.eval(
      this.INCREMENT_WITH_CAP_SCRIPT,
      { keys: [counterKey], arguments: [capacity.toString()] }
    );
    
    if (result === -1) {
      return false; // At capacity
    }
    
    // Sync to MongoDB asynchronously (don't block response)
    this.syncCapacityToMongo(sessionId, result as number).catch(err => 
      this.logger.error(`Failed to sync capacity: ${err.message}`)
    );
    
    return true;
  } catch (error) {
    // Fallback to MongoDB atomic operation
    return this.sessionRepository.incrementCheckInCountWithCapacity(sessionId, capacity);
  }
}
```

---

### Issue #2: Null Value Caching Bug

**Severity:** 🔴 CRITICAL  
**Location:** `src/modules/participants/participants.service.ts` - Multiple methods  
**Impact:** Cache misses treated as cache hits, wrong data returned

#### Problem Description

```typescript
// CURRENT PROBLEMATIC CODE
async findOne(id: string): Promise<Participant | null> {
  const cacheKey = `${CACHE_KEYS.PARTICIPANT_ID}${id}`;
  const cached = await this.cacheManager.get<Participant>(cacheKey);
  
  // ⚠️ BUG: If participant doesn't exist and we cached `null`,
  // this check passes because `null !== undefined`
  if (cached !== undefined) {
    return cached;
  }
  // ...
}
```

**Problem:** `cache-manager` returns `undefined` for cache miss, but `null` is a valid cached value. The check `cached !== undefined` allows `null` through, which is correct. However, if the underlying store returns `null` for misses (some do), this breaks.

#### Recommended Fix

Use a **sentinel wrapper pattern**:

```typescript
// FIXED CODE
interface CacheWrapper<T> {
  data: T;
  timestamp: number;
}

const CACHE_MISS = Symbol('CACHE_MISS');

async findOne(id: string): Promise<Participant | null> {
  const cacheKey = `${CACHE_KEYS.PARTICIPANT_ID}${id}`;
  
  try {
    const cached = await this.cacheManager.get<CacheWrapper<Participant | null>>(cacheKey);
    
    // Explicit cache hit check
    if (cached && typeof cached === 'object' && 'data' in cached) {
      return cached.data;
    }
  } catch (error) {
    this.logger.warn(`Cache read failed for ${cacheKey}: ${error.message}`);
  }
  
  // Cache miss - fetch from DB
  const participant = await this.participantRepository.findById(id);
  
  // Cache with wrapper (including null results)
  await this.cacheManager.set(cacheKey, { 
    data: participant, 
    timestamp: Date.now() 
  }, this.redisTTL.participant);
  
  return participant;
}
```

---

## High Priority Issues (P1 - Fix Before Scale Testing)

### Issue #3: Cache Stampede on Stats Endpoints

**Severity:** 🟠 HIGH  
**Location:** `participants.service.ts` - `getStats()`, `getAmbassadorLeaderboard()`  
**Impact:** Database overload, cascading failures under load

#### Problem Description

When cache expires, all concurrent requests hit the database simultaneously:

```
Time 0:00 - Cache expires
Time 0:01 - Request 1 → Cache miss → DB query starts
Time 0:01 - Request 2 → Cache miss → DB query starts  
Time 0:01 - Request 3 → Cache miss → DB query starts
... 100 requests all hitting DB simultaneously
```

#### Recommended Fix

Implement **singleflight pattern** with mutex:

```typescript
// Add to participants.service.ts
private readonly pendingRequests = new Map<string, Promise<any>>();

private async withSingleflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
  // Check if request already in flight
  const pending = this.pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  
  // Create new request
  const promise = factory().finally(() => {
    this.pendingRequests.delete(key);
  });
  
  this.pendingRequests.set(key, promise);
  return promise;
}

async getStats(): Promise<ParticipantStats> {
  const cacheKey = CACHE_KEYS.PARTICIPANT_STATS;
  
  const cached = await this.cacheManager.get<ParticipantStats>(cacheKey);
  if (cached) return cached;
  
  // Use singleflight to prevent stampede
  return this.withSingleflight(cacheKey, async () => {
    // Double-check cache after acquiring "lock"
    const cachedAgain = await this.cacheManager.get<ParticipantStats>(cacheKey);
    if (cachedAgain) return cachedAgain;
    
    const stats = await this.participantRepository.getStats();
    await this.cacheManager.set(cacheKey, stats, this.redisTTL.stats);
    return stats;
  });
}
```

---

### Issue #4: Redis-MongoDB Dual-Write Inconsistency

**Severity:** 🟠 HIGH  
**Location:** `sessions.service.ts` - `incrementCheckInCountWithCapacity()`  
**Impact:** Permanent data drift between Redis and MongoDB

#### Problem Description

```typescript
// Redis increment succeeds
await this.redisClient.incr(counterKey);

// MongoDB update happens separately
// If MongoDB fails, Redis and MongoDB are now inconsistent
await this.sessionRepository.incrementCheckInCount(sessionId);
```

#### Recommended Fix

Treat Redis as **authoritative for real-time** and sync to MongoDB asynchronously with reconciliation:

```typescript
// 1. Redis is source of truth for capacity during event
// 2. Background job syncs to MongoDB every 30 seconds
// 3. On session end, final reconciliation from check-in records

@Cron('*/30 * * * * *') // Every 30 seconds
async syncCapacityCounters(): Promise<void> {
  const sessionKeys = await this.redisClient.keys(`${CACHE_KEYS.SESSION_CAPACITY}*`);
  
  for (const key of sessionKeys) {
    const sessionId = key.replace(CACHE_KEYS.SESSION_CAPACITY, '');
    const redisCount = await this.redisClient.get(key);
    
    if (redisCount) {
      await this.sessionRepository.updateCheckInCount(
        sessionId, 
        parseInt(redisCount, 10)
      );
    }
  }
}
```

---

## Medium Priority Issues (P2 - Fix Before Production)

### Issue #5: Missing Environment-Based Key Prefix

**Severity:** 🟡 MEDIUM  
**Location:** `src/modules/redis/redis.config.ts`  
**Impact:** Cache collisions between environments (dev/staging/prod)

#### Problem Description

```typescript
// Current keys have no environment prefix
export const CACHE_KEYS = {
  PARTICIPANT_ID: 'participant:id:',
  SESSION_ID: 'session:id:',
  // ...
};
```

If dev and prod share a Redis instance (common in cost-saving setups), keys will collide.

#### Recommended Fix

```typescript
// FIXED CODE
const ENV_PREFIX = process.env.NODE_ENV || 'development';
const APP_PREFIX = process.env.REDIS_KEY_PREFIX || 'checkin';

export const CACHE_KEYS = {
  PARTICIPANT_ID: `${APP_PREFIX}:${ENV_PREFIX}:participant:id:`,
  PARTICIPANT_QR: `${APP_PREFIX}:${ENV_PREFIX}:participant:qr:`,
  PARTICIPANT_EMAIL: `${APP_PREFIX}:${ENV_PREFIX}:participant:email:`,
  PARTICIPANT_STATS: `${APP_PREFIX}:${ENV_PREFIX}:participant:stats`,
  AMBASSADOR_LEADERBOARD: `${APP_PREFIX}:${ENV_PREFIX}:ambassador:leaderboard`,
  SESSION_ID: `${APP_PREFIX}:${ENV_PREFIX}:session:id:`,
  SESSION_STATS: `${APP_PREFIX}:${ENV_PREFIX}:session:stats`,
  SESSION_CAPACITY: `${APP_PREFIX}:${ENV_PREFIX}:session:capacity:`,
};
```

---

### Issue #6: No Redis Connection Resilience

**Severity:** 🟡 MEDIUM  
**Location:** `src/modules/redis/redis.module.ts`  
**Impact:** Application crash on Redis disconnect

#### Problem Description

```typescript
// Current: No retry strategy, no circuit breaker
const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
```

#### Recommended Fix

```typescript
// FIXED CODE
const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max retries reached, giving up');
        return new Error('Redis max retries reached');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
    connectTimeout: 10000,
  },
});

client.on('error', (err) => logger.error('Redis Client Error', err));
client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
client.on('ready', () => logger.log('Redis connection ready'));
```

---

### Issue #7: Socket.IO Adapter Warning

**Severity:** 🟡 MEDIUM  
**Location:** `src/adapters/redis-io.adapter.ts`  
**Impact:** Potential issues with horizontal scaling

#### Problem Description

Console shows: `When scaling to multiple Socket.IO servers, you need to...`

This warning appears because Redis adapter setup may be timing out or the connection isn't fully established before the adapter is used.

#### Recommended Fix

```typescript
// Ensure Redis connections are established before creating adapter
async connectToRedis(): Promise<void> {
  const pubClient = createClient({ url: this.redisUrl });
  const subClient = pubClient.duplicate();

  // Wait for both connections
  await Promise.all([
    pubClient.connect(),
    subClient.connect()
  ]);

  // Verify connections are ready
  await pubClient.ping();
  await subClient.ping();

  this.adapterConstructor = createAdapter(pubClient, subClient);
  this.logger.log('Socket.IO Redis adapter connected successfully');
}
```

---

## Low Priority Issues (P3 - Nice to Have)

### Issue #8: No Cache Metrics/Monitoring

**Severity:** 🟢 LOW  
**Impact:** Limited visibility into cache performance

#### Recommendation

Add Prometheus metrics for:
- Cache hit/miss ratio
- Cache latency
- Redis connection pool status
- Memory usage

```typescript
// Example with prom-client
import { Counter, Histogram } from 'prom-client';

const cacheHits = new Counter({
  name: 'cache_hits_total',
  labelNames: ['cache_type'],
});

const cacheMisses = new Counter({
  name: 'cache_misses_total', 
  labelNames: ['cache_type'],
});

const cacheLatency = new Histogram({
  name: 'cache_operation_duration_seconds',
  labelNames: ['operation', 'cache_type'],
});
```

---

### Issue #9: TTL Configuration Could Be More Granular

**Severity:** 🟢 LOW  
**Location:** `src/modules/redis/redis.config.ts`

#### Current Configuration

```typescript
export const getRedisTTL = () => ({
  participant: parseInt(process.env.REDIS_PARTICIPANT_TTL || '600000', 10),  // 10 min
  session: parseInt(process.env.REDIS_SESSION_TTL || '60000', 10),           // 1 min
  stats: parseInt(process.env.REDIS_STATS_TTL || '30000', 10),               // 30 sec
  capacity: parseInt(process.env.REDIS_CAPACITY_TTL || '5000', 10),          // 5 sec
});
```

#### Recommendation

Consider different TTLs for:
- Active session data (shorter)
- Historical/archived data (longer)
- Per-session-type configuration

---

## Implementation Priority Matrix

| Priority | Issue | Effort | Impact | Order |
|----------|-------|--------|--------|-------|
| P0 | TOCTOU Race Condition | 4h | Critical | 1st |
| P0 | Null Caching Bug | 1h | Critical | 2nd |
| P1 | Cache Stampede | 2h | High | 3rd |
| P1 | Dual-Write Inconsistency | 3h | High | 4th |
| P2 | Environment Key Prefix | 30m | Medium | 5th |
| P2 | Connection Resilience | 2h | Medium | 6th |
| P2 | Socket.IO Adapter Warning | 1h | Medium | 7th |
| P3 | Cache Metrics | 4h | Low | Optional |
| P3 | Granular TTL | 1h | Low | Optional |

---

## Testing Recommendations

### Load Testing Scenarios

```bash
# 1. Capacity Race Condition Test
# Simulate 100 concurrent check-ins for a session with capacity 50
artillery run capacity-race-test.yml

# 2. Cache Stampede Test  
# Invalidate cache and send 1000 concurrent stats requests
artillery run stampede-test.yml

# 3. Redis Failover Test
# Simulate Redis disconnect during active check-ins
docker stop redis && sleep 5 && docker start redis
```

### Recommended Tools

- **Artillery** - Load testing
- **Redis CLI** - Monitor commands (`redis-cli monitor`)
- **Prometheus + Grafana** - Metrics visualization

---

## Files Modified During Redis Integration

| File | Changes |
|------|---------|
| `src/modules/redis/redis.module.ts` | NEW - Global Redis module |
| `src/modules/redis/redis.config.ts` | NEW - TTL and key configuration |
| `src/modules/participants/participants.service.ts` | Added caching layer |
| `src/modules/sessions/sessions.service.ts` | Added caching + capacity counter |
| `src/adapters/redis-io.adapter.ts` | NEW - Socket.IO Redis adapter |
| `src/main.ts` | Integrated Redis adapter |
| `.env` | Added Redis configuration variables |

---

## Conclusion

The Redis caching implementation provides a solid foundation but requires **critical fixes** before production deployment:

1. **Must Fix (P0):** Atomic capacity checking with Lua script
2. **Must Fix (P0):** Null caching sentinel pattern
3. **Should Fix (P1):** Singleflight pattern for stampede protection
4. **Should Fix (P1):** Proper dual-write reconciliation strategy

After implementing P0 and P1 fixes, the system should be able to handle 1,000 concurrent users safely.

---

## References

- [Redis Distributed Locks (Redlock)](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Cache Stampede Prevention](https://en.wikipedia.org/wiki/Cache_stampede)
- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
