// K6 Smoke Test
// ============================================================================
// Quick verification that the system is working under minimal load
// Run: k6 run k6-tests/scenarios/smoke-test.js
// ============================================================================

import { sleep, check } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // 1. Health check
  const healthResult = http.get(`${BASE_URL}/health`);
  check(healthResult, {
    'health check passed': (r) => r.status === 200,
  });

  sleep(1);

  // 2. Get sessions list
  const sessionsResponse = http.get(`${BASE_URL}/sessions?limit=5`);
  check(sessionsResponse, {
    'sessions list returned': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Get session stats
  const statsResponse = http.get(`${BASE_URL}/sessions/stats`);
  check(statsResponse, {
    'session stats returned': (r) => r.status === 200,
  });

  sleep(1);

  // 4. Get participants
  const participantsResponse = http.get(`${BASE_URL}/participants?limit=5`);
  check(participantsResponse, {
    'participants list returned': (r) => r.status === 200,
  });

  sleep(1);

  // 5. Get check-in stats
  const checkinStatsResponse = http.get(`${BASE_URL}/checkin/stats`);
  check(checkinStatsResponse, {
    'check-in stats returned': (r) => r.status === 200,
  });

  sleep(1);
}

export function handleSummary(data) {
  console.log('\n========================================');
  console.log('       SMOKE TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.passes}`);
  console.log(`Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log('========================================\n');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
