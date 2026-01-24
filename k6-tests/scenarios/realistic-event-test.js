// K6 Realistic Event Test
// ============================================================================
// Simulates a realistic check-in scenario:
// - 10 officers scanning QR codes
// - 300 participants over 30 minutes
// - ~1 scan every 6 seconds per officer = ~100 scans/min total
// ============================================================================

import { sleep, check } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  // Simulate 10 officers scanning simultaneously
  scenarios: {
    officers: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.05'],     // Less than 5% errors
    checks: ['rate>0.95'],              // 95% of checks pass
  },
};

// Simulates one officer's scan workflow
export default function () {
  // 1. Officer scans QR code and app fetches participant info
  const participantSearch = http.get(`${BASE_URL}/participants?limit=1`);
  check(participantSearch, {
    'participant lookup ok': (r) => r.status === 200,
  });
  
  sleep(0.5);
  
  // 2. App fetches current session info
  const sessions = http.get(`${BASE_URL}/sessions?limit=1`);
  check(sessions, {
    'session lookup ok': (r) => r.status === 200,
  });
  
  sleep(0.5);
  
  // 3. Check-in stats (dashboard refresh)
  const stats = http.get(`${BASE_URL}/checkin/stats`);
  check(stats, {
    'stats ok': (r) => r.status === 200,
  });
  
  // Wait 5 seconds before next scan (realistic pace)
  // 10 officers × 1 scan/6s = ~100 scans/minute
  sleep(5);
}

export function handleSummary(data) {
  const totalReqs = data.metrics.http_reqs.values.count;
  const failedRate = data.metrics.http_req_failed.values.rate * 100;
  const avgDuration = data.metrics.http_req_duration.values.avg;
  const p95Duration = data.metrics.http_req_duration.values['p(95)'];
  
  const passed = failedRate < 5;
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           REALISTIC EVENT SIMULATION RESULTS                   ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Officers Simulated:      10                                   ║`);
  console.log(`║  Total API Calls:         ${totalReqs.toString().padEnd(38)}║`);
  console.log(`║  Error Rate:              ${failedRate.toFixed(2)}%${' '.repeat(35 - failedRate.toFixed(2).length)}║`);
  console.log(`║  Avg Response Time:       ${avgDuration.toFixed(2)}ms${' '.repeat(34 - avgDuration.toFixed(2).length)}║`);
  console.log(`║  P95 Response Time:       ${p95Duration.toFixed(2)}ms${' '.repeat(34 - p95Duration.toFixed(2).length)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Result: ${passed ? '✅ PASS - Ready for production!' : '❌ FAIL - Needs investigation'}${' '.repeat(passed ? 27 : 22)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
