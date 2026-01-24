// K6 Endpoint-Specific Tests
// ============================================================================
// Individual endpoint performance tests
// Run: k6 run k6-tests/scenarios/endpoint-tests.js
// ============================================================================

import { sleep, check, group } from 'k6';
import { Trend } from 'k6/metrics';
import { CONFIG, getRandomItem, TEST_DATA } from '../config.js';
import * as api from '../helpers/api.js';

// Endpoint-specific trends
const sessionsTrend = new Trend('endpoint_sessions');
const participantsTrend = new Trend('endpoint_participants');
const checkinTrend = new Trend('endpoint_checkin');
const healthTrend = new Trend('endpoint_health');
const statsTrend = new Trend('endpoint_stats');

export const options = {
  scenarios: {
    // Test each endpoint separately
    sessions_endpoint: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      exec: 'testSessions',
    },
    participants_endpoint: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '2m30s',
      exec: 'testParticipants',
    },
    checkin_endpoint: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '5m',
      exec: 'testCheckin',
    },
    stats_endpoint: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '7m30s',
      exec: 'testStats',
    },
    health_endpoint: {
      executor: 'constant-vus',
      vus: 3,
      duration: '2m',
      startTime: '10m',
      exec: 'testHealth',
    },
  },
  
  thresholds: {
    endpoint_sessions: ['p(95)<200', 'avg<100'],
    endpoint_participants: ['p(95)<200', 'avg<100'],
    endpoint_checkin: ['p(95)<300', 'avg<150'],
    endpoint_health: ['p(95)<100', 'avg<50'],
    endpoint_stats: ['p(95)<250', 'avg<100'],
  },
};

// ============================================================================
// SESSIONS ENDPOINT TESTS
// ============================================================================

export function testSessions() {
  group('Sessions Endpoint Tests', () => {
    // Test 1: List sessions (paginated)
    let start = Date.now();
    const listRes = api.getSessions({ page: 1, limit: 20 });
    sessionsTrend.add(Date.now() - start);
    
    check(listRes, {
      'sessions list 200': (r) => r.status === 200,
      'sessions list has data': (r) => JSON.parse(r.body).data?.length >= 0,
    });
    
    sleep(0.5);
    
    // Test 2: Get open sessions
    start = Date.now();
    const openRes = api.getOpenSessions();
    sessionsTrend.add(Date.now() - start);
    
    check(openRes, {
      'open sessions 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Test 3: Session stats
    start = Date.now();
    const statsRes = api.getSessionStats();
    sessionsTrend.add(Date.now() - start);
    
    check(statsRes, {
      'session stats 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Test 4: Upcoming sessions
    start = Date.now();
    const upcomingRes = api.getUpcomingSessions(5);
    sessionsTrend.add(Date.now() - start);
    
    check(upcomingRes, {
      'upcoming sessions 200': (r) => r.status === 200,
    });
    
    sleep(1);
  });
}

// ============================================================================
// PARTICIPANTS ENDPOINT TESTS
// ============================================================================

export function testParticipants() {
  group('Participants Endpoint Tests', () => {
    // Test 1: List participants
    let start = Date.now();
    const listRes = api.getParticipants({ page: 1, limit: 20 });
    participantsTrend.add(Date.now() - start);
    
    check(listRes, {
      'participants list 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Test 2: Search participants
    const searchTerms = ['John', 'Sarah', 'Dr', 'a', 'e'];
    start = Date.now();
    const searchRes = api.searchParticipants(getRandomItem(searchTerms));
    participantsTrend.add(Date.now() - start);
    
    check(searchRes, {
      'participants search 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Test 3: Participant stats
    start = Date.now();
    const statsRes = api.getParticipantStats();
    participantsTrend.add(Date.now() - start);
    
    check(statsRes, {
      'participant stats 200': (r) => r.status === 200,
    });
    
    sleep(1);
  });
}

// ============================================================================
// CHECK-IN ENDPOINT TESTS
// ============================================================================

export function testCheckin() {
  group('Check-in Endpoint Tests', () => {
    // Test 1: Get check-in stats
    let start = Date.now();
    const statsRes = api.getCheckInStats();
    checkinTrend.add(Date.now() - start);
    
    check(statsRes, {
      'checkin stats 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Test 2: Recent check-ins
    start = Date.now();
    const recentRes = api.getRecentCheckIns(20);
    checkinTrend.add(Date.now() - start);
    
    check(recentRes, {
      'recent checkins 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Test 3: Verify check-in (random IDs - will return false or 404)
    start = Date.now();
    const verifyRes = api.verifyCheckIn(
      TEST_DATA.participantIds[0],
      TEST_DATA.sessionIds[0]
    );
    checkinTrend.add(Date.now() - start);
    
    check(verifyRes, {
      'verify checkin responded': (r) => r.status === 200 || r.status === 404,
    });
    
    sleep(1);
  });
}

// ============================================================================
// STATS ENDPOINT TESTS
// ============================================================================

export function testStats() {
  group('Stats Endpoint Tests', () => {
    // Session stats
    let start = Date.now();
    api.getSessionStats();
    statsTrend.add(Date.now() - start);
    
    sleep(0.3);
    
    // Check-in stats
    start = Date.now();
    api.getCheckInStats();
    statsTrend.add(Date.now() - start);
    
    sleep(0.3);
    
    // Participant stats
    start = Date.now();
    api.getParticipantStats();
    statsTrend.add(Date.now() - start);
    
    sleep(1);
  });
}

// ============================================================================
// HEALTH ENDPOINT TESTS
// ============================================================================

export function testHealth() {
  group('Health Endpoint Tests', () => {
    // Full health check
    let start = Date.now();
    const healthRes = api.healthCheck();
    healthTrend.add(Date.now() - start);
    
    check(healthRes.response, {
      'health check 200': (r) => r.status === 200,
      'database connected': (r) => {
        const body = JSON.parse(r.body);
        return body.database?.status === 'connected';
      },
    });
    
    sleep(0.5);
    
    // Liveness probe
    start = Date.now();
    const liveRes = api.healthLive();
    healthTrend.add(Date.now() - start);
    
    check(liveRes, {
      'liveness 200': (r) => r.status === 200,
    });
    
    sleep(0.5);
    
    // Readiness probe
    start = Date.now();
    const readyRes = api.healthReady();
    healthTrend.add(Date.now() - start);
    
    check(readyRes, {
      'readiness 200': (r) => r.status === 200,
    });
    
    sleep(1);
  });
}

export function handleSummary(data) {
  const summary = {
    test: 'endpoint-tests',
    timestamp: new Date().toISOString(),
    
    endpoints: {
      sessions: {
        avg: data.metrics.endpoint_sessions?.values.avg?.toFixed(2) || 0,
        p95: data.metrics.endpoint_sessions?.values['p(95)']?.toFixed(2) || 0,
        count: data.metrics.endpoint_sessions?.values.count || 0,
      },
      participants: {
        avg: data.metrics.endpoint_participants?.values.avg?.toFixed(2) || 0,
        p95: data.metrics.endpoint_participants?.values['p(95)']?.toFixed(2) || 0,
        count: data.metrics.endpoint_participants?.values.count || 0,
      },
      checkin: {
        avg: data.metrics.endpoint_checkin?.values.avg?.toFixed(2) || 0,
        p95: data.metrics.endpoint_checkin?.values['p(95)']?.toFixed(2) || 0,
        count: data.metrics.endpoint_checkin?.values.count || 0,
      },
      stats: {
        avg: data.metrics.endpoint_stats?.values.avg?.toFixed(2) || 0,
        p95: data.metrics.endpoint_stats?.values['p(95)']?.toFixed(2) || 0,
        count: data.metrics.endpoint_stats?.values.count || 0,
      },
      health: {
        avg: data.metrics.endpoint_health?.values.avg?.toFixed(2) || 0,
        p95: data.metrics.endpoint_health?.values['p(95)']?.toFixed(2) || 0,
        count: data.metrics.endpoint_health?.values.count || 0,
      },
    },
    
    overall: {
      totalRequests: data.metrics.http_reqs?.values.count || 0,
      errorRate: ((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2) + '%',
    },
  };

  console.log('\n========================================');
  console.log('   ENDPOINT PERFORMANCE RESULTS');
  console.log('========================================');
  console.log('Endpoint          | Avg (ms) | P95 (ms) | Requests');
  console.log('------------------|----------|----------|----------');
  
  for (const [name, metrics] of Object.entries(summary.endpoints)) {
    const padName = name.padEnd(17);
    const padAvg = metrics.avg.toString().padStart(8);
    const padP95 = metrics.p95.toString().padStart(8);
    const padCount = metrics.count.toString().padStart(8);
    console.log(`${padName} | ${padAvg} | ${padP95} | ${padCount}`);
  }
  
  console.log('------------------|----------|----------|----------');
  console.log(`Total Requests: ${summary.overall.totalRequests}`);
  console.log(`Overall Error Rate: ${summary.overall.errorRate}`);
  console.log('========================================\n');

  return {
    'k6-tests/results/endpoint-tests-summary.json': JSON.stringify(summary, null, 2),
  };
}
