// K6 Quick Load Test - Standalone
// ============================================================================
// Fast load test (2 minutes) with 30 concurrent users
// Run: k6 run k6-tests/scenarios/quick-load-test.js
// ============================================================================

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Custom metrics
const checkinRequests = new Counter('checkin_requests');
const sessionRequests = new Counter('session_requests');
const participantRequests = new Counter('participant_requests');

export const options = {
  stages: [
    { duration: '20s', target: 30 },   // Ramp up to 30 users
    { duration: '1m', target: 30 },    // Stay at 30 users
    { duration: '20s', target: 50 },   // Push to 50
    { duration: '30s', target: 50 },   // Stay at 50
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

// Weighted random action selection
function selectAction() {
  const rand = Math.random() * 100;
  if (rand < 25) return 'sessions';
  if (rand < 45) return 'participants';
  if (rand < 65) return 'stats';
  if (rand < 80) return 'checkins';
  return 'health';
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  const action = selectAction();

  switch (action) {
    case 'sessions':
      group('Sessions API', () => {
        // List sessions
        const listRes = http.get(`${BASE_URL}/sessions?limit=10`);
        check(listRes, {
          'sessions 200': (r) => r.status === 200,
        });
        sessionRequests.add(1);
        
        sleep(0.3);
        
        // Get open sessions
        const openRes = http.get(`${BASE_URL}/sessions?isOpen=true`);
        check(openRes, {
          'open sessions 200': (r) => r.status === 200,
        });
        sessionRequests.add(1);
        
        sleep(0.2);
        
        // Upcoming
        http.get(`${BASE_URL}/sessions/upcoming?limit=5`);
        sessionRequests.add(1);
      });
      break;

    case 'participants':
      group('Participants API', () => {
        // Search
        const searchTerms = ['john', 'sarah', 'dr', 'a', 'e', 'mohamed'];
        const searchRes = http.get(`${BASE_URL}/participants?search=${getRandomItem(searchTerms)}&limit=10`);
        check(searchRes, {
          'search 200': (r) => r.status === 200,
        });
        participantRequests.add(1);
        
        sleep(0.2);
        
        // Stats
        http.get(`${BASE_URL}/participants/stats`);
        participantRequests.add(1);
      });
      break;

    case 'stats':
      group('Statistics', () => {
        http.get(`${BASE_URL}/sessions/stats`);
        sleep(0.2);
        http.get(`${BASE_URL}/checkin/stats`);
        sleep(0.2);
        http.get(`${BASE_URL}/participants/stats`);
      });
      break;

    case 'checkins':
      group('Check-ins API', () => {
        // Recent check-ins
        const recentRes = http.get(`${BASE_URL}/checkin/recent?limit=20`);
        check(recentRes, {
          'recent checkins 200': (r) => r.status === 200,
        });
        checkinRequests.add(1);
        
        sleep(0.2);
        
        // Check-in stats
        http.get(`${BASE_URL}/checkin/stats`);
        checkinRequests.add(1);
      });
      break;

    case 'health':
      group('Health', () => {
        const healthRes = http.get(`${BASE_URL}/health`);
        check(healthRes, {
          'health 200': (r) => r.status === 200,
          'db connected': (r) => {
            try {
              return JSON.parse(r.body).database?.status === 'connected';
            } catch { return false; }
          },
        });
        
        sleep(0.1);
        http.get(`${BASE_URL}/health/ready`);
      });
      break;
  }

  // Think time between 0.5 and 2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  const reqCount = data.metrics.http_reqs?.values.count || 0;
  const failRate = ((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2);
  const avgDuration = data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0;
  const p95Duration = data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0;
  const p99Duration = data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0;
  const maxVUs = data.metrics.vus_max?.values.max || 0;
  const rps = data.metrics.http_reqs?.values.rate?.toFixed(2) || 0;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    LOAD TEST RESULTS                         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Max Virtual Users:     ${String(maxVUs).padStart(6)}                            ║`);
  console.log(`║  Total Requests:        ${String(reqCount).padStart(6)}                            ║`);
  console.log(`║  Requests/Second:       ${String(rps).padStart(6)}                            ║`);
  console.log(`║  Error Rate:            ${String(failRate + '%').padStart(7)}                           ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  RESPONSE TIMES                                              ║');
  console.log(`║  Average:               ${String(avgDuration + 'ms').padStart(10)}                        ║`);
  console.log(`║  P95:                   ${String(p95Duration + 'ms').padStart(10)}                        ║`);
  console.log(`║  P99:                   ${String(p99Duration + 'ms').padStart(10)}                        ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Pass/Fail verdict
  const passed = parseFloat(failRate) < 5 && parseFloat(p95Duration) < 500;
  if (passed) {
    console.log('✅ PASS: All thresholds met');
  } else {
    console.log('❌ FAIL: Thresholds exceeded');
  }

  return {};
}
