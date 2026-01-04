# 🔴 Redis Caching Performance & Consistency Audit

**Auditor**: Senior Backend Performance Engineer  
**Date**: January 3, 2026  
**Scope**: Production-grade audit for ~1000 concurrent users, zero tolerance for race conditions  
**System**: NestJS + Redis + MongoDB check-in application

---

## Executive Summary

| Category | Score | Risk Level |
|----------|-------|------------|
| **1. Correctness** | 7/10 | ⚠️ Medium |
| **2. Performance Under Concurrency** | 6/10 | 🔴 High |
| **3. Data Consistency Safety** | 5/10 | 🔴 Critical |
| **4. Memory Efficiency** | 7/10 | ⚠️ Medium |
| **5. Production Readiness** | 6/10 | ⚠️ Medium |

**Overall Score: 6.2/10** — Not production-ready for high-concurrency without fixes.

---

## 1. Correctness (7/10) ⚠️

### ✅ What's Working Well

1. **Sentinel Pattern for Null Values**
   ```typescript
   interface CacheWrapper<T> {
     data: T;
     cachedAt: number;
   }
   ```
   - Correctly distinguishes between "not in cache" and "cached null value"
   - Prevents unnecessary DB lookups for non-existent entities

2. **Environment-Prefixed Cache Keys**
   ```typescript
   const ENV_PREFIX = process.env.NODE_ENV || 'development';
   const APP_PREFIX = process.env.REDIS_KEY_PREFIX || 'checkin';
   const CACHE_KEYS = {
     SESSION_BY_ID: `${APP_PREFIX}:${ENV_PREFIX}:session:id:`,
   }
   ```
   - Prevents key collisions across environments

3. **Graceful Fallbacks**
   - NullRedisClient pattern prevents crashes when Redis unavailable
   - In-memory cache fallback for cache manager

### 🔴 Critical Issues

#### Issue 1.1: Cache Key Collision Vulnerability (Severity: P1)
**Location**: Multiple services  
**Problem**: Cache keys use raw entity IDs without namespace for lookup type.

```typescript
// participants.service.ts - Multiple keys can reference same participant
PARTICIPANT_BY_ID: `${APP_PREFIX}:${ENV_PREFIX}:participant:id:`,
PARTICIPANT_BY_QR: `${APP_PREFIX}:${ENV_PREFIX}:participant:qr:`,
PARTICIPANT_BY_EMAIL: `${APP_PREFIX}:${ENV_PREFIX}:participant:email:`,
```

**Risk**: If QR code value happens to match a MongoDB ObjectId format, you get cross-key pollution.

**Fix**:
```typescript
// Add type-safe suffix
PARTICIPANT_BY_ID: `${APP_PREFIX}:${ENV_PREFIX}:participant:byId:`,
PARTICIPANT_BY_QR: `${APP_PREFIX}:${ENV_PREFIX}:participant:byQr:`,
PARTICIPANT_BY_EMAIL: `${APP_PREFIX}:${ENV_PREFIX}:participant:byEmail:`,
```

#### Issue 1.2: Missing Cache Invalidation on Bulk Operations (Severity: P1)
**Location**: `participants.service.ts:bulkCreate()`

```typescript
async bulkCreate(participants: BulkParticipantItemDto[]): Promise<...> {
  for (const participantData of participants) {
    await this.create({ ...participantData }); // create() doesn't invalidate stats
  }
  // Stats cache NOT invalidated after bulk creation!
}
```

**Impact**: Stats endpoint returns stale counts after bulk imports.

---

## 2. Performance Under Concurrency (6/10) 🔴

### ✅ What's Working Well

1. **Singleflight Pattern**
   ```typescript
   private async withSingleflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
     const pending = this.pendingRequests.get(key);
     if (pending) return pending as Promise<T>;
     // ...
   }
   ```
   - Prevents cache stampede on stats/leaderboard queries
   - Coalesces concurrent requests for same key

2. **Lua Script for Atomic Capacity**
   ```typescript
   const INCREMENT_WITH_CAP_SCRIPT = `
     local current = tonumber(redis.call('GET', KEYS[1]) or '0')
     local capacity = tonumber(ARGV[1])
     if current >= capacity then return -1 end
     return redis.call('INCR', KEYS[1])
   `;
   ```
   - True atomic check-and-increment

### 🔴 Critical Issues

#### Issue 2.1: Race Condition in Check-In Flow (Severity: P0)
**Location**: `checkins.service.ts:create()`

```typescript
// Step 4: Check capacity (READ)
const capacityStatus = await this.sessionsService.getCapacityStatus(sessionId);
if (capacityStatus.isAtCapacity) throw...

// Gap here - capacity can change!

// Step 5: Create check-in (WRITE)
checkIn = await this.checkInRepository.create({...});

// Step 6: Atomically increment (SHOULD BE BEFORE STEP 5!)
const updatedSession = await this.sessionsService.incrementCheckInCountWithCapacity(sessionId);

// Rollback if failed
if (!updatedSession && capacityStatus.capacityEnforced) {
  await this.checkInRepository.deleteById(checkIn._id.toString());
}
```

**The Race**:
```
T1: Check capacity (99/100) ✓
T2: Check capacity (99/100) ✓
T1: Create check-in
T2: Create check-in
T1: Atomic increment (100) ✓
T2: Atomic increment returns null (101 > capacity)
T2: Delete check-in (rollback)
```

**Problem**: Under 1000 concurrent users, you'll see:
1. **Unnecessary DB writes** (create then delete)
2. **Poor UX** (user sees success then failure)
3. **MongoDB index contention** (E11000 errors cascade)

**Fix**: Reserve capacity FIRST, then create check-in:
```typescript
// CORRECT order:
// 1. Atomic reserve slot (Redis Lua)
// 2. Create check-in record
// 3. On failure: release slot
```

#### Issue 2.2: N+1 Cache Reads in Sync Job (Severity: P1)
**Location**: `sessions.service.ts:syncCapacityCounters()`

```typescript
@Cron(CronExpression.EVERY_30_SECONDS)
async syncCapacityCounters(): Promise<void> {
  const keys = await this.redisClient.keys(pattern); // KEYS command is O(n)!
  for (const key of keys) {
    const redisCount = await this.redisClient.get(key); // Sequential reads
    await this.sessionRepository.reconcileCheckInCount(sessionId, count);
  }
}
```

**Problem**: 
- `KEYS` command blocks Redis (O(n) scan)
- Sequential reads instead of pipeline/MGET
- With 100 active sessions: 100 round trips every 30s

**Fix**:
```typescript
// Use SCAN instead of KEYS
async syncCapacityCounters(): Promise<void> {
  const keys: string[] = [];
  for await (const key of this.redisClient.scanIterator({ MATCH: pattern })) {
    keys.push(key);
  }
  // Use MGET for batch read
  const values = await this.redisClient.mGet(keys);
}
```

#### Issue 2.3: Missing Cache on Hot Path (Severity: P1)
**Location**: `checkins.service.ts:create()` - Step 1

```typescript
// Step 1: Verify session exists and is open
const session = await this.sessionsService.findOne(sessionId);
```

**This IS cached ✓**, but...

```typescript
// Step 4: Check capacity
const capacityStatus = await this.sessionsService.getCapacityStatus(sessionId);
```

**`getCapacityStatus()` goes directly to MongoDB!**

**Impact**: Every QR scan hits MongoDB for capacity check.

---

## 3. Data Consistency Safety (5/10) 🔴 CRITICAL

### 🔴 Critical Issues

#### Issue 3.1: Redis-MongoDB Divergence Window (Severity: P0)
**Location**: `sessions.service.ts:incrementCheckInCountWithCapacity()`

```typescript
// Redis increment succeeds
const result = await this.redisClient.eval(INCREMENT_WITH_CAP_SCRIPT, {...});

// Fire-and-forget sync to MongoDB
this.syncCapacityToMongo(sessionId, newCount).catch(err => 
  this.logger.error(`Failed to sync capacity to MongoDB: ${err.message}`)
);
```

**Failure Scenario**:
```
1. Redis: checkInsCount = 50
2. MongoDB: checkInsCount = 48 (sync lag)
3. App restarts - Redis counter lost
4. Redis re-initialized from MongoDB: 48
5. 2 PHANTOM check-ins now possible!
```

**Impact**: Capacity enforcement FAILS after Redis restart.

**Fix**: Write-through pattern:
```typescript
// Write to MongoDB FIRST (source of truth)
await this.sessionRepository.incrementCheckInCount(sessionId);
// Then update Redis (for speed)
await this.redisClient.incr(capacityKey);
```

#### Issue 3.2: Cache Invalidation Timing (Severity: P1)
**Location**: Multiple services

```typescript
// sessions.service.ts:update()
const session = await this.sessionRepository.updateById(id, updateData);
if (!session) throw...

// Cache invalidated AFTER successful write
await this.invalidateSessionCache(id);
```

**The Problem**: Between DB write and cache invalidation:
```
T1: Update session in DB (capacity: 100 → 50)
T2: Read from cache (sees capacity: 100) 
T2: Checks in user (capacity check passes with old value)
T1: Invalidate cache
```

**Window**: 1-10ms under load, but enough for 10+ concurrent requests.

#### Issue 3.3: No Distributed Lock on Critical Operations (Severity: P1)
**Problem**: Multi-instance deployment + singleflight = instance-local only.

```typescript
// This only works within ONE instance
private readonly pendingRequests = new Map<string, Promise<any>>();
```

**Impact**: Cache stampede protection FAILS across multiple backend instances.

**Fix**: Use Redis-based distributed lock (Redlock):
```typescript
import Redlock from 'redlock';

const redlock = new Redlock([this.redisClient]);
const lock = await redlock.acquire([`lock:${cacheKey}`], 5000);
try {
  // fetch and cache
} finally {
  await lock.release();
}
```

---

## 4. Memory Efficiency (7/10) ⚠️

### ✅ What's Working Well

1. **TTL Configuration**
   ```typescript
   participantTtl: 600000,  // 10 min - good for stable data
   sessionTtl: 60000,       // 1 min - good for changing data
   statsTtl: 30000,         // 30s - good for aggregates
   capacityTtl: 5000,       // 5s - very short, good for accuracy
   ```

2. **In-Memory Fallback Limits**
   ```typescript
   return { store: 'memory', ttl: 60000, max: 1000 };
   ```

### 🔴 Issues

#### Issue 4.1: Unbounded Capacity Keys (Severity: P2)
**Location**: `sessions.service.ts`

```typescript
await this.redisClient.expire(capacityKey, 3600); // 1 hour TTL
```

**Problem**: Session capacity keys created indefinitely. Old sessions' keys persist.

**With 1000 sessions/year**: 8760 hours × potential keys = memory growth.

#### Issue 4.2: Full Document Caching (Severity: P2)
```typescript
await this.cacheManager.set(cacheKey, { 
  data: participant,  // ENTIRE document
  cachedAt: Date.now() 
}, this.participantTtl);
```

**Problem**: ParticipantDocument includes all fields:
- `referredParticipantIds[]` - can be large
- `checkInHistory[]` - grows over time
- Full Mongoose document metadata

**Estimate**: 5KB/participant × 10,000 participants = 50MB cache.

**Fix**: Cache projections, not full documents:
```typescript
interface CachedParticipant {
  _id: string;
  email: string;
  qrCode: string;
  name: string;
  status: string;
}
```

---

## 5. Production Readiness (6/10) ⚠️

### ✅ Production-Ready Features

1. **Health Checks with Redis Status** ✓
2. **Graceful Degradation** ✓
3. **Error Logging** ✓
4. **Retry Strategies** ✓

### 🔴 Missing for Production

#### Issue 5.1: No Redis Cluster Support (Severity: P1)
```typescript
const client = createClient({
  socket: { host, port }  // Single node only
});
```

**Impact**: No horizontal scaling, single point of failure.

#### Issue 5.2: No Metrics/Monitoring (Severity: P1)
**Missing**:
- Cache hit/miss ratio
- Average latency
- Memory usage
- Connection pool stats

**Fix**: Add Prometheus metrics:
```typescript
const cacheHits = new promClient.Counter({
  name: 'redis_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_key']
});
```

#### Issue 5.3: No Circuit Breaker (Severity: P2)
**Problem**: If Redis is slow (not down), every request waits for timeout.

**Fix**: Implement circuit breaker pattern:
```typescript
import CircuitBreaker from 'opossum';
const cacheBreaker = new CircuitBreaker(cacheOperation, {
  timeout: 100, // 100ms max
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

---

## Prioritized Fix Roadmap

### 🔴 P0 - Fix Immediately (Data Corruption Risk)

| Issue | Location | Effort | Impact |
|-------|----------|--------|--------|
| 2.1 Race in check-in flow | checkins.service.ts | 2h | Overbooking |
| 3.1 Redis-MongoDB divergence | sessions.service.ts | 3h | Phantom check-ins |

### ⚠️ P1 - Fix Before Production (Performance/Reliability)

| Issue | Location | Effort | Impact |
|-------|----------|--------|--------|
| 1.2 Bulk op invalidation | participants.service.ts | 1h | Stale stats |
| 2.2 N+1 in sync job | sessions.service.ts | 2h | Redis blocking |
| 2.3 Capacity check uncached | checkins.service.ts | 1h | DB load |
| 3.2 Invalidation timing | Multiple | 2h | Stale reads |
| 3.3 Distributed lock | New | 3h | Stampede |
| 5.1 Redis Cluster | redis.module.ts | 4h | Scalability |
| 5.2 Metrics | New | 3h | Observability |

### 📋 P2 - Fix for Optimization

| Issue | Location | Effort | Impact |
|-------|----------|--------|--------|
| 1.1 Key collision | Multiple | 1h | Edge case |
| 4.1 Unbounded keys | sessions.service.ts | 1h | Memory |
| 4.2 Full doc caching | Multiple | 3h | Memory |
| 5.3 Circuit breaker | New | 2h | Latency |

---

## Recommended Code Changes

### Fix 2.1: Correct Check-In Order

```typescript
// checkins.service.ts - FIXED create() method
async create(createCheckInDto: CreateCheckInDto): Promise<CheckInResult> {
  // Step 1-3: Validations (unchanged)
  const session = await this.sessionsService.findOne(createCheckInDto.sessionId);
  const participant = await this.participantsService.findOne(createCheckInDto.participantId);
  // ... registration check ...

  // STEP 4: ATOMIC RESERVE SLOT FIRST
  const reservation = await this.sessionsService.reserveCapacitySlot(sessionId);
  if (!reservation.success) {
    throw new ValidationException([{ 
      field: 'sessionId', 
      message: `Session at capacity (${reservation.capacity}/${reservation.capacity})` 
    }]);
  }

  try {
    // STEP 5: Create check-in AFTER reservation
    const checkIn = await this.checkInRepository.create({...});
    return { checkIn, capacityInfo: reservation };
  } catch (error) {
    // STEP 6: Release slot on failure
    await this.sessionsService.releaseCapacitySlot(sessionId);
    throw error;
  }
}
```

### Fix 3.1: Write-Through Pattern

```typescript
// sessions.service.ts - FIXED incrementCheckInCountWithCapacity()
async incrementCheckInCountWithCapacity(sessionId: string): Promise<SessionDocument | null> {
  // ALWAYS write to MongoDB first (source of truth)
  const result = await this.sessionRepository.incrementCheckInCountWithCapacity(sessionId);
  
  if (result && this.isRedisAvailable()) {
    // Update Redis counter to match MongoDB
    try {
      const capacityKey = `${CACHE_KEYS.SESSION_CAPACITY}${sessionId}`;
      await this.redisClient.set(capacityKey, result.checkInsCount.toString());
      await this.redisClient.expire(capacityKey, 3600);
    } catch (error) {
      this.logger.warn(`Failed to sync Redis counter: ${error.message}`);
      // Continue - MongoDB is authoritative
    }
  }
  
  await this.invalidateSessionCache(sessionId);
  return result;
}
```

### Fix 2.2: Use SCAN Instead of KEYS

```typescript
// sessions.service.ts - FIXED syncCapacityCounters()
@Cron(CronExpression.EVERY_30_SECONDS)
async syncCapacityCounters(): Promise<void> {
  if (!this.isRedisAvailable()) return;

  try {
    const pattern = `${CACHE_KEYS.SESSION_CAPACITY}*`;
    const keys: string[] = [];
    
    // Use SCAN iterator (non-blocking)
    for await (const key of this.redisClient.scanIterator({ 
      MATCH: pattern, 
      COUNT: 100 
    })) {
      keys.push(key);
    }
    
    if (keys.length === 0) return;
    
    // Batch read with MGET
    const values = await this.redisClient.mGet(keys);
    
    // Process in parallel batches
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await Promise.all(batch.map(async (key, idx) => {
        const sessionId = key.replace(CACHE_KEYS.SESSION_CAPACITY, '');
        const count = parseInt(values[i + idx] || '0', 10);
        await this.sessionRepository.reconcileCheckInCount(sessionId, count);
      }));
    }
  } catch (error) {
    this.logger.error(`Capacity sync failed: ${error.message}`);
  }
}
```

---

## Conclusion

**Current State**: The caching implementation shows good foundational patterns (sentinel, singleflight, Lua scripts) but has critical race conditions and consistency gaps that will cause data corruption under 1000 concurrent users.

**Required for Production**:
1. Fix check-in race condition (reserve-before-write)
2. Implement write-through for capacity counters
3. Add distributed locking
4. Replace KEYS with SCAN
5. Add observability (metrics, tracing)

**Estimated Effort**: 20-25 hours for P0+P1 fixes.
